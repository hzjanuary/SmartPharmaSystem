import asyncio
import json
import logging
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Dict, Optional

from google import genai
from google.genai import types

from config import SYSTEM_PROMPT_TEMPLATE, cfg
from memory import memory_manager
from tools import registry

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 5
LATENCY_WINDOW_SIZE = 30


@dataclass
class TurnMetrics:
    llm_ms: float = 0.0
    tool_ms: float = 0.0
    total_ms: float = 0.0
    llm_calls: int = 0
    tool_calls: int = 0
    path: str = "react"
    model_used: str = ""


class Brain:
    def __init__(self):
        if not cfg.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY is not set. Bot cannot call Gemini until configured.")

        self.client = genai.Client(api_key=cfg.GEMINI_API_KEY)
        self._latency_by_chat = defaultdict(lambda: deque(maxlen=LATENCY_WINDOW_SIZE))

    async def think(self, chat_id: int, user_message: str) -> str:
        memory = memory_manager.get(chat_id)
        t0 = time.perf_counter()
        metrics = TurnMetrics(model_used=cfg.GEMINI_MODEL)

        memory.add_message("user", user_message)

        response_text = await self._react_loop(memory, metrics)

        memory.add_message("assistant", response_text)

        metrics.total_ms = (time.perf_counter() - t0) * 1000
        self._record_latency(chat_id, metrics)
        return response_text

    async def _react_loop(self, memory, metrics: TurnMetrics) -> str:
        ephemeral_messages = []

        for _ in range(MAX_TOOL_ITERATIONS):
            prompt = self._build_prompt(memory, ephemeral_messages)
            llm_t0 = time.perf_counter()
            raw_response = await self._generate(prompt)
            metrics.llm_ms += (time.perf_counter() - llm_t0) * 1000
            metrics.llm_calls += 1

            tool_call = self._parse_tool_call(raw_response)
            if not tool_call:
                if "TOOL_CALL" in (raw_response or ""):
                    # The model attempted a tool call but returned malformed JSON.
                    # Ask it to re-send a strict JSON payload instead of leaking it to user.
                    ephemeral_messages.append({"role": "assistant", "content": raw_response})
                    ephemeral_messages.append(
                        {
                            "role": "user",
                            "content": (
                                "Ban vua gui TOOL_CALL sai dinh dang. "
                                "Hay gui lai CHI JSON hop le theo mau: "
                                '{"action":"TOOL_CALL","tool_name":"...","tool_args":{...},"reasoning":"..."}'
                            ),
                        }
                    )
                    continue
                return raw_response

            tool_name = tool_call.get("tool_name", "")
            tool_args = tool_call.get("tool_args", {})
            if not isinstance(tool_args, dict):
                tool_args = {}

            tool_t0 = time.perf_counter()
            tool_result = await registry.execute(tool_name, tool_args)
            metrics.tool_ms += (time.perf_counter() - tool_t0) * 1000
            metrics.tool_calls += 1

            ephemeral_messages.append({"role": "assistant", "content": raw_response})
            ephemeral_messages.append(
                {
                    "role": "user",
                    "content": (
                        f"[TOOL RESULT for {tool_name}]\n{tool_result}\n\n"
                        "Hay dua ra cau tra loi cuoi cung cho Admin dua tren du lieu that tu tool."
                    ),
                }
            )

        return "Khong the hoan tat yeu cau sau nhieu buoc xu ly. Vui long thu lai."

    async def _generate(self, prompt: str) -> str:
        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=cfg.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=cfg.MAX_TOKENS,
                ),
            )
            text = (getattr(response, "text", "") or "").strip()
            if text:
                return text

            candidates = getattr(response, "candidates", None) or []
            if candidates:
                first_candidate = candidates[0]
                content = getattr(first_candidate, "content", None)
                parts = getattr(content, "parts", []) if content else []
                joined = "\n".join(
                    getattr(part, "text", "") for part in parts if getattr(part, "text", "")
                ).strip()
                if joined:
                    return joined
            return "Toi khong nhan duoc noi dung hop le tu Gemini."
        except Exception as ex:
            logger.exception("Gemini call failed")
            return f"Loi khi goi Gemini: {type(ex).__name__}: {ex}"

    def _build_prompt(self, memory, ephemeral_messages) -> str:
        history_lines = []
        for item in memory.get_history():
            role = item.get("role", "user")
            content = item.get("content", "")
            history_lines.append(f"[{role.upper()}] {content}")

        for msg in ephemeral_messages:
            history_lines.append(f"[{msg['role'].upper()}] {msg['content']}")

        return (
            f"{SYSTEM_PROMPT_TEMPLATE.format(available_tools=registry.get_tools_manifest())}\n\n"
            "Ban phai theo dinh dang sau neu can goi tool:\n"
            "{\"action\":\"TOOL_CALL\",\"tool_name\":\"<name>\",\"tool_args\":{...},\"reasoning\":\"...\"}\n\n"
            f"Lich su hoi thoai:\n{chr(10).join(history_lines)}\n\n"
            "Neu da du du lieu, tra loi truc tiep ngan gon cho Admin."
        )

    @staticmethod
    def _parse_tool_call(response_text: str) -> Optional[Dict]:
        stripped = (response_text or "").strip()
        if not stripped:
            return None

        def _validate(payload: Dict) -> Optional[Dict]:
            if payload.get("action") == "TOOL_CALL" and payload.get("tool_name"):
                if not isinstance(payload.get("tool_args"), dict):
                    payload["tool_args"] = {}
                return payload
            return None

        def _try_json_load(candidate: str) -> Optional[Dict]:
            try:
                data = json.loads(candidate)
                if isinstance(data, dict):
                    return _validate(data)
            except json.JSONDecodeError:
                return None
            return None

        parsed = _try_json_load(stripped)
        if parsed:
            return parsed

        # Common malformed pattern from model: {"action","TOOL_CALL",...}
        normalized = re.sub(r'"action"\s*,\s*"TOOL_CALL"', '"action":"TOOL_CALL"', stripped)
        parsed = _try_json_load(normalized)
        if parsed:
            return parsed

        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, re.DOTALL)
        if fence_match:
            fenced = fence_match.group(1)
            parsed = _try_json_load(fenced)
            if parsed:
                return parsed
            normalized_fenced = re.sub(r'"action"\s*,\s*"TOOL_CALL"', '"action":"TOOL_CALL"', fenced)
            parsed = _try_json_load(normalized_fenced)
            if parsed:
                return parsed

        # Fallback extraction when JSON is partially malformed but still contains fields.
        if "TOOL_CALL" in stripped and "tool_name" in stripped:
            tool_name_match = re.search(r'"tool_name"\s*:\s*"([^"]+)"', stripped)
            tool_args_match = re.search(r'"tool_args"\s*:\s*(\{.*?\})', stripped, re.DOTALL)
            if tool_name_match:
                tool_name = tool_name_match.group(1)
                tool_args: Dict = {}
                if tool_args_match:
                    try:
                        maybe_args = json.loads(tool_args_match.group(1))
                        if isinstance(maybe_args, dict):
                            tool_args = maybe_args
                    except json.JSONDecodeError:
                        tool_args = {}
                return {
                    "action": "TOOL_CALL",
                    "tool_name": tool_name,
                    "tool_args": tool_args,
                    "reasoning": "Recovered from loosely formatted model output.",
                }

        return None

    def _record_latency(self, chat_id: int, metrics: TurnMetrics):
        self._latency_by_chat[chat_id].append(metrics)

    def get_latency_report(self, chat_id: int) -> str:
        data = list(self._latency_by_chat.get(chat_id, []))
        if not data:
            return "Chua co du lieu latency cho chat nay."

        turns = len(data)
        avg_total = sum(m.total_ms for m in data) / turns
        avg_llm = sum(m.llm_ms for m in data) / turns
        avg_tool = sum(m.tool_ms for m in data) / turns
        last = data[-1]

        return (
            f"Latency {turns} turns\n"
            f"- Avg Total: {avg_total:.1f} ms\n"
            f"- Avg LLM: {avg_llm:.1f} ms\n"
            f"- Avg Tool: {avg_tool:.1f} ms\n"
            f"- Last: total={last.total_ms:.1f} | llm={last.llm_ms:.1f} | tool={last.tool_ms:.1f} | model={last.model_used}"
        )


brain = Brain()
