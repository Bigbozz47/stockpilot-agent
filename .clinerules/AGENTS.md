\# AGENTS.md — Rules for AI Coding Agents

This document defines operational guidelines, architectural boundaries, coding standards, and behavioral constraints for all AI coding agents (OpenAI Codex, Claude, Cursor, Copilot, Cline) working on \*\*StockPilot Agent™\*\*.

\<\!-- BEGIN: stack-agent-rules \--\>  
\#\# ⚠️ Important: Tech Stack & Architecture Notice

This project is built strictly on the \*\*MERN Stack\*\*:  
\- \*\*Frontend:\*\* Next.js 14+ with \*\*App Router\*\* \+ TypeScript \+ Tailwind CSS v4.  
\- \*\*Backend:\*\* Node.js runtime \+ Express.js API handlers / Next.js Server Route Handlers.  
\- \*\*Database:\*\* MongoDB via Mongoose ODM (strictly validated schemas).  
\- \*\*AI Core:\*\* Muse Spark Node.js SDK (muse-spark-1.3) using \*\*Strict Structured Outputs (\`response\_format: json\_schema\`)\*\* and \*\*Tool / Function Calling\*\*.

\> \*\*CRITICAL RULE:\*\* All inventory math (Safety Stock, Reorder Point, Total Order Cost) MUST be executed in deterministic TypeScript code (\`src/lib/math.ts\`). NEVER rely on LLM token generation for arithmetic financial calculations.  
\<\!-- END: stack-agent-rules \--\>

\---

\#\# 1\. Project Identity

\* \*\*App Name:\*\* StockPilot Agent™  
\* \*\*Type:\*\* Autonomous Supply-Chain & Procurement Agent Console  
\* \*\*Runtime:\*\* Node.js 20+ / TypeScript 5+  
\* \*\*Primary Color Scheme:\*\* White Ops Console (Slate \`\#FFFFFF\` background, Green \`\#4CAF50\` for verified actions, Yellow \`\#FFEB3B\` for stockout alerts).  
\* \*\*UI Philosophy:\*\* Pro-grade operator console (Promax UX),High density, low cognitive load, real-time reactive feedback via Server-Sent Events (SSE), zero "AI slop" or chat wrappers and Action-oriented layouts prioritizing determinism.

\---

\#\# 2\. Core Rules for AI Coding Agents

\#\#\# 2.1 Never Do This (Strict Anti-Patterns)  
\* ❌ \*\*Never use the \`pages/\` directory:\*\* Always use \*\*App Router\*\* conventions (\`app/api/...\` and \`app/page.tsx\`).  
\* ❌ \*\*Never perform arithmetic inside LLM prompts:\*\* LLM is strictly used for qualitative reasoning across constraints. All additions, price multiplications, and order quantity ceilings must be handled in \`src/lib/math.ts\`.  
\* ❌ \*\*Never bypass Zod / Mongoose schema validation:\*\* All API payloads, tool outputs, and database mutations must be strictly typed and validated.  
\* ❌ \*\*Never hardcode secrets or API keys:\*\* Never embed \`MUSE SPARK\_API\_KEY\` or MongoDB connection strings into source files. Always use \`process.env\`.  
\* ❌ \*\*Never execute financial dispatch without human confirmation:\*\* The agent must never transition a Purchase Order status to \`DISPATCHED\` without receiving an explicit user \`APPROVED\` event.  
\* ❌ \*\*Never use \`@ts-ignore\`:\*\* Resolve type issues properly using defined interfaces in \`src/types/index.ts\`.  
\* ❌ \*\*Never break offline/mock resilience:\*\* Always ensure mock fixtures in \`public/mock-data/\` can be toggled via \`process.env.USE\_MOCK\_AGENT \=== 'true'\`.

\#\#\# 2.2 Always Do This (Mandatory Standards)  
\* ✅ \*\*Strict JSON Schema:\*\* Always configure Muse SparkI tool calling with \`strict: true\` and explicit parameter schemas.  
\* ✅ \*\*Atomic Database Mutations:\*\* When recording a Purchase Order or mutating stock, always log a corresponding record in \`StockMovement\` or \`AgentAuditLog\`.  
\* ✅ \*\*Centralized Type Definitions:\*\* Define all shared data structures in \`src/types/index.ts\`.  
\* ✅ \*\*Explainable Logs:\*\* Every agent action must emit structured event logs (\*Observe, Reason, Plan, Act, Verify\*) so the frontend console can render the live thought process via SSE.  
