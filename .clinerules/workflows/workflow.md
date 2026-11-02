\# StockPilot Development Workflow

\> Instructions for AI coding agents to operate under strict governance: when to request user confirmation, when to proceed autonomously, and when a task is officially complete (\*Definition of Done\*).

\---

\#\# 1\. General Principles

1\. \*\*Working Prototype First:\*\* Prioritize a robust, working end-to-end execution loop over ten half-finished, non-functional features.  
2\. \*\*Step-by-Step Transparency:\*\* The AI agent must briefly state what files it plans to create or modify and why before writing code.  
3\. \*\*Strict Separation of Concerns:\*\* Mathematical arithmetic is deterministic; contextual prioritization belongs to LLM tools.  
4\. \*\*Document Key Decisions:\*\* Any structural changes to Mongoose schemas, environment configurations, or API routes must be logged in \`TODO.md\` and \`ARCHITECTURE.md\`.

\---

\#\# 2\. When to Ask for Permission (Require User Approval)

The AI Coding Agent \*\*MUST\*\* pause and obtain explicit user consent before:  
\* ⚠️ Deleting existing files, folders, or database collections.  
\* ⚠️ Altering Mongoose core schemas (\`Product\`, \`PurchaseOrder\`, \`Supplier\`).  
\* ⚠️ Installing heavy npm packages that significantly alter the runtime bundle or framework version.  
\* ⚠️ Modifying security policies, authentication mechanisms, or environment secret mappings.  
\* ⚠️ Executing changes that introduce breaking changes to APIs already wired to the frontend console.

\---

\#\# 3\. When to Proceed Autonomously (Autonomous Execution Allowed)

The AI Coding Agent is \*\*AUTHORIZED\*\* to proceed without interruption when:  
\* ✅ Scaffolding new UI components inside \`src/components/\`.  
\* ✅ Writing pure utility functions in \`src/lib/\` (e.g., currency formatters, inventory math algorithms).  
\* ✅ Resolving isolated TypeScript syntax errors, import mismatches, or interface lint warnings.  
\* ✅ Populating mock JSON fixtures in \`public/mock-data/\`.  
\* ✅ Updating task completion checkboxes in \`TODO.md\`.  
\* ✅ Executing automated build and type-checking scripts (\`npm run build\`, \`tsc \--noEmit\`).

\---

\#\# 4\. Definition of Done (DoD)

A task in \`TODO.md\` may only be checked off as completed \`\[x\]\` when:  
\* \[x\] All functional acceptance criteria from \`PRD.md\` are satisfied.  
\* \[x\] TypeScript compiler passes cleanly with zero errors (\`tsc \--noEmit\`).  
\* \[x\] UI components render without hydration errors, layout shifts, or console warnings.  
\* \[x\] API responses match defined Zod / Mongoose validation schemas.  
\* \[x\] Critical edge cases are covered (e.g., zero stock, invalid supplier ID, timeout fallback).  
\* \[x\] Task status is updated in \`TODO.md\`.

\---

\#\# 5\. Reporting & Communication Standards

\* \*\*Action-Oriented & Concise:\*\* Deliver direct summaries of actions taken and files modified. Avoid unsolicited theoretical essays during active coding sessions.  
\* \*\*Declare Assumptions Explicitly:\*\* If an edge case or parameter is unspecified, state the assumed default clearly before proceeding.  
\* \*\*Keep Progress Synchronized:\*\* Transition tasks to \`\[/\]\` (In Progress) when starting, and \`\[x\]\` (Done) upon verification.  
