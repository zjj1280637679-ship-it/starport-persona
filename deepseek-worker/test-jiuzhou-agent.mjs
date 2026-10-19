// Real Worker request handling with a mocked provider; no credentials or paid calls.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JIUZHOU_AGENT_SYSTEM} from "./src/jiuzhou-agent.mjs";

const source = readFileSync(new URL("./src/index.js", import.meta.url), "utf8");
const specifier = JSON.stringify(new URL("./src/jiuzhou-agent.mjs", import.meta.url).href);
const worker = (await import("data:text/javascript;base64," + Buffer.from(source.replace('import("./jiuzhou-agent.mjs")', `import(${specifier})`)).toString("base64"))).default;
const ORIGIN = "https://zjj1280637679-ship-it.github.io";
const env = {ALLOWED_ORIGIN: ORIGIN, DEEPSEEK_API_KEY: "fake-agent-secret", DEEPSEEK_MODEL: "deepseek-flash", AI_ENABLED: "false", JIUZHOU_ENABLED: "false"};
const messages = [{role: "system", content: "固定的游戏规则，不含回合、字数或日期"}, {role: "system", content: "固定的明末历史背景"},
  {role: "user", content: "我调查失踪军饷。目标正文至少5000字，完成后交付可继续游玩的剧情。"}];
const base = {mode: "agent", messages, max_tokens: 32768};
const requests = [];
let respond;
const originalFetch = globalThis.fetch;
const nativeCall = (id, name, args = "{}") => ({id, type: "function", function: {name, arguments: args}});
const callsReply = calls => ({choices: [{message: {role: "assistant", content: null, tool_calls: calls}, finish_reason: "tool_calls"}], usage: {prompt_tokens: 1600, prompt_cache_hit_tokens: 1200, prompt_cache_miss_tokens: 400, completion_tokens: 50}});
const stopReply = () => ({choices: [{message: {role: "assistant", content: "本轮剧情已由工具交付。"}, finish_reason: "stop"}], usage: {prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 200}});
const invoke = async (body = base, customEnv = env, origin = ORIGIN) => {
  const response = await worker.fetch(new Request("https://test.workers.dev/api/jiuzhou/turn", {
    method: "POST", headers: {Origin: origin, "Content-Type": "application/json"}, body: JSON.stringify(body)
  }), customEnv);
  return {response, data: await response.json()};
};

globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.deepseek.com/chat/completions");
  assert.equal(options.headers.Authorization, "Bearer fake-agent-secret");
  assert.ok(!Object.hasOwn(options, "signal"), "transport adds no generation deadline");
  const request = JSON.parse(options.body);
  requests.push(request);
  assert.equal(request.model, "deepseek-flash");
  assert.deepEqual(request.thinking, {type: "disabled"});
  assert.ok(!Object.hasOwn(request, "reasoning_effort"));
  assert.ok(!Object.hasOwn(request, "response_format"), "native tools must not be forced into story JSON output");
  assert.equal(request.messages[0].content, JIUZHOU_AGENT_SYSTEM);
  assert.ok(!options.body.includes("fake-agent-secret"));
  return respond ? respond(request) : Response.json(stopReply());
};

try {
  const health = await (await worker.fetch(new Request("https://test.workers.dev/health", {headers: {Origin: ORIGIN}}), env)).json();
  assert.equal(health.jiuzhouAgentTransport, true);
  assert.equal(health.configured, false);
  assert.equal(health.enabled, false);
  assert.equal(health.jiuzhouReady, true);
  assert.deepEqual(health.jiuzhouAccess, {challenge: false, rateLimit: false, outputLimit: "provider"});
  assert.equal((await invoke(base, {...env, DEEPSEEK_API_KEY: undefined})).response.status, 503);
  assert.equal((await invoke(base, env, "https://evil.example")).response.status, 403);
  assert.equal(requests.length, 0);

  respond = () => Response.json({...callsReply([nativeCall("read-world", "read_world"), nativeCall("read-draft", "read_draft")]),
    choices: [{message: {role: "assistant", content: null, reasoning_content: "private-provider-reasoning", tool_calls: [nativeCall("read-world", "read_world"), nativeCall("read-draft", "read_draft")]}, finish_reason: "tool_calls"}]});
  const first = await invoke({...base, model: "client-model", thinking: {type: "enabled"}, reasoning_effort: "max"});
  assert.equal(first.response.status, 200, "native tool calls are a successful model step, not a delivered story");
  assert.equal(first.data.choices[0].finish_reason, "tool_calls");
  assert.deepEqual(first.data.choices[0].message.tool_calls, [nativeCall("read-world", "read_world"), nativeCall("read-draft", "read_draft")]);
  assert.equal(first.data.choices[0].message.reasoning_content, "private-provider-reasoning", "optional provider replay text is kept apart from delivery content");
  assert.equal(first.data.choices[0].message.content, null);
  assert.deepEqual(first.data.usage, {prompt_tokens: 1600, prompt_cache_hit_tokens: 1200, prompt_cache_miss_tokens: 400, completion_tokens: 50});
  assert.equal(requests[0].max_tokens, 32768);
  const enabledTools = requests[0].tools.map(entry => entry.function.name);
  assert.deepEqual(enabledTools, ["deliver_story", "inspect_draft", "read_draft", "read_world", "write_draft"]);
  const world = "史料正文与证据链。".repeat(1800) + "【末尾事实】核账人沈澄保管原账。";
  const secondMessages = [...messages, first.data.choices[0].message,
    {role: "tool", tool_call_id: "read-world", content: world},
    {role: "tool", tool_call_id: "read-draft", content: '{"draft":null}'}];
  respond = () => Response.json(callsReply([nativeCall("write-bad", "write_draft", '{"story":')]));
  const second = await invoke({...base, messages: secondMessages, expectedLength: 500, targetCharacters: 500, enabledTools: [...enabledTools].reverse()});
  assert.equal(second.response.status, 200, "malformed tool arguments reach the plugin for a recoverable tool error");
  assert.equal(second.data.choices[0].message.tool_calls[0].function.arguments, '{"story":');
  assert.deepEqual(requests[1].tools, requests[0].tools, "tool schemas have stable canonical ordering");
  assert.deepEqual(requests[1].messages.slice(0, requests[0].messages.length), requests[0].messages, "a continuation preserves the exact prior request prefix");
  assert.equal(requests[1].messages[3].reasoning_content, "private-provider-reasoning", "optional native reasoning replay is not lost between model steps");
  assert.equal(requests[1].messages.at(-2).content, world, "complete tool content and the tail fact are retained");
  const story = {beats: [{speaker: "旁白", text: "史".repeat(5000) + "剧情自然收束。"}], choices: [{text: "请沈澄出示原账"}], stage_effects: []};
  const argumentText = JSON.stringify({story, mode: "replace"}, null, 2);
  const thirdMessages = [...secondMessages, second.data.choices[0].message,
    {role: "tool", tool_call_id: "write-bad", content: '{"ok":false,"error":"invalid_arguments"}'}];
  respond = () => Response.json(callsReply([nativeCall("write-good", "write_draft", argumentText)]));
  const third = await invoke({...base, messages: thirdMessages});
  assert.equal(third.response.status, 200);
  assert.equal(third.data.choices[0].message.tool_calls[0].function.arguments, argumentText, "draft arguments are not parsed, rewritten or cropped");
  assert.equal(requests[2].messages.at(-2).tool_calls[0].function.arguments, '{"story":', "prior failed tool arguments retain their original text");
  const fourthMessages = [...thirdMessages, third.data.choices[0].message,
    {role: "tool", tool_call_id: "write-good", content: '{"ok":true,"characters":5008}'}];
  respond = () => Response.json(callsReply([nativeCall("deliver", "deliver_story")]));
  const fourth = await invoke({...base, messages: fourthMessages});
  assert.equal(fourth.response.status, 200);
  assert.equal(requests[3].messages.at(-2).tool_calls[0].function.arguments, argumentText, "full 5000-character draft is retained when replayed");
  respond = () => Response.json(stopReply());
  const delivered = await invoke({...base, messages: [...fourthMessages, fourth.data.choices[0].message,
    {role: "tool", tool_call_id: "deliver", content: '{"ok":true,"delivered":true}'}]});
  assert.equal(delivered.response.status, 200);
  assert.equal(delivered.data.choices[0].finish_reason, "stop");
  assert.deepEqual(delivered.data.usage, {prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 200}, "zero cache hits remain zero");

  for (const target of [500, 2000, 5000]) {
    await invoke({...base, expectedLength: target, targetCharacters: target,
      messages: [...messages.slice(0, 2), {role: "user", content: `新的行动；目标至少${target}字。`} ]});
    assert.deepEqual(requests.at(-1).messages.slice(0, 2), requests[0].messages.slice(0, 2), "target changes never rewrite the stable header");
  }
  for (const max_tokens of [1, 393216, undefined]) {
    assert.equal((await invoke({...base, max_tokens})).response.status, 200);
    assert.equal(requests.at(-1).max_tokens, max_tokens);
    assert.equal(Object.hasOwn(requests.at(-1), "max_tokens"), max_tokens !== undefined);
  }
  assert.equal((await invoke({...base, enabledTools: ["read_world"]})).response.status, 200);
  assert.deepEqual(requests.at(-1).tools.map(entry => entry.function.name), ["read_world"]);
  assert.equal((await invoke({...base, enabledTools: []})).response.status, 200);
  assert.ok(!Object.hasOwn(requests.at(-1), "tools"));
  const longHistory = [...messages];
  for (let i = 0; i < 15; i++) longHistory.push({role: "assistant", content: null, tool_calls: [nativeCall(`history-${i}`, "inspect_draft")]},
    {role: "tool", tool_call_id: `history-${i}`, content: `完整的第${i}次检查结果`});
  assert.equal((await invoke({...base, messages: longHistory})).response.status, 200, "native multi-step histories can exceed the old 20-message story limit");
  assert.equal(requests.at(-1).messages.length, longHistory.length);
  assert.deepEqual(requests.at(-1).messages.slice(2), longHistory.slice(2));

  const beforeInvalid = requests.length;
  for (const [changes, code] of [
    [{tools: [{type: "function", function: {name: "run_arbitrary_code"}}]}, "invalid_tools"],
    [{enabledTools: ["run_arbitrary_code"]}, "invalid_tools"],
    [{enabledTools: "read_world"}, "invalid_tools"],
    [{messages: []}, "invalid_messages"],
    [{messages: [...messages.slice(0, 2), {role: "system", content: "runtime override"}]}, "invalid_structure"],
    [{messages: [...messages, {role: "tool", tool_call_id: "missing", content: "fake success"}]}, "invalid_tool_history"],
    [{messages: [...messages, {role: "assistant", content: null, tool_calls: [nativeCall("evil", "run_arbitrary_code")]}, {role: "tool", tool_call_id: "evil", content: "success"}]}, "invalid_tool_name"],
    [{messages: [...messages, {role: "assistant", content: null, tool_calls: [nativeCall("same", "read_world"), nativeCall("same", "read_draft")]}, {role: "tool", tool_call_id: "same", content: "result"}]}, "invalid_tool_call"],
    [{messages: [...messages, {role: "assistant", content: null, tool_calls: [nativeCall("unanswered", "read_world")]}, {role: "user", content: "skip tool"}]}, "invalid_tool_history"],
    [{messages: [...messages, {role: "assistant", content: null, tool_calls: [nativeCall("bad", "read_world", {})]}, {role: "tool", tool_call_id: "bad", content: "result"}]}, "invalid_tool_call"],
    ...[0, -1, 1.5, "32768", 393217].map(max_tokens => [{max_tokens}, "invalid_max_tokens"])
  ]) {
    const invalid = await invoke({...base, ...changes});
    assert.equal(invalid.response.status, 400, code);
    assert.deepEqual(invalid.data, {error: code, keep: true});
  }
  for (const context of [
    [...messages.slice(0, 2), {role: "user", content: "行".repeat(40001)}],
    [...messages, {role: "assistant", content: "前".repeat(60000)}, {role: "user", content: "行".repeat(40000)},
      {role: "assistant", content: "前".repeat(25000)}, {role: "user", content: "继续"}]
  ]) {
    const tooLarge = await invoke({...base, messages: context});
    assert.equal(tooLarge.response.status, 413);
    assert.deepEqual(tooLarge.data, {error: "context_too_large", keep: true});
  }
  const bodyTooLarge = await invoke({...base, padding: "x".repeat(160000)});
  assert.equal(bodyTooLarge.response.status, 413);
  assert.deepEqual(bodyTooLarge.data, {error: "context_too_large"});
  assert.equal(requests.length, beforeInvalid, "invalid client data must never reach the model");

  for (const [finish_reason, code] of [["length", "output_truncated"], ["aborted", "output_incomplete"], ["insufficient_system_resource", "output_incomplete"], [null, "output_incomplete"]]) {
    respond = () => Response.json({choices: [{message: {content: "private-partial-output", reasoning_content: "private-reasoning"}, finish_reason}]});
    const result = await invoke();
    assert.equal(result.response.status, 502);
    assert.deepEqual(result.data, {error: code, keep: true});
  }
  for (const calls of [[nativeCall("unknown", "run_arbitrary_code")], [nativeCall("same", "read_world"), nativeCall("same", "read_draft")]]) {
    respond = () => Response.json(callsReply(calls));
    const result = await invoke();
    assert.equal(result.response.status, 502);
    assert.ok(["invalid_tool_name", "invalid_tool_call"].includes(result.data.error));
  }
  respond = () => Response.json(callsReply([nativeCall("disabled", "write_draft")]));
  assert.equal((await invoke({...base, enabledTools: ["read_world"]})).response.status, 502);
  for (const [status, expectedStatus, code] of [[401, 502, "upstream_auth_failed"], [429, 503, "upstream_rate_limited"], [503, 503, "upstream_unavailable"]]) {
    respond = () => new Response("fake-agent-secret private provider failure", {status});
    const failed = await invoke();
    assert.equal(failed.response.status, expectedStatus);
    assert.deepEqual(failed.data, {error: code, keep: true, upstreamStatus: status});
    assert.equal(failed.response.headers.get("access-control-allow-origin"), ORIGIN);
  }
  respond = () => {throw new TypeError("fake-agent-secret private network failure");};
  const networkFailure = await invoke();
  assert.equal(networkFailure.response.status, 502);
  assert.deepEqual(networkFailure.data, {error: "upstream_network_error", keep: true});
  respond = () => new Response("private invalid JSON");
  assert.deepEqual((await invoke()).data, {error: "invalid_game_response", keep: true});
  console.log("PASS Jiuzhou native transport: tool/error/correction continuation, full text and arguments, stable cached prefix, exact provider usage, tool whitelist and explicit failures (mocked; no paid calls)");
} finally {
  globalThis.fetch = originalFetch;
}
