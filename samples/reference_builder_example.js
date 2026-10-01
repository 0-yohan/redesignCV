const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, ShadingType, BorderStyle,
  PageOrientation, TableLayoutType
} = require("docx");
const fs = require("fs");

const NAVY="0F1E33", WHITE="FFFFFF", TEAL_LIGHT="BFEFEA", TEAL_DATE="1F6F6B";
const GOLD="E8A33D", GRAY="555555", DARK_GRAY="222222", BLACK="000000";

const sectionHeading = t => new Paragraph({ children:[new TextRun({text:t,bold:true,size:26,color:NAVY})], spacing:{before:320,after:140}, border:{bottom:{style:BorderStyle.SINGLE,size:6,color:NAVY,space:4}} });
const jobTitle = t => new Paragraph({ children:[new TextRun({text:t,bold:true,size:22,color:NAVY})], spacing:{before:180,after:40} });
const dateLine = t => new Paragraph({ children:[new TextRun({text:t,italics:true,size:19,color:TEAL_DATE})], spacing:{after:100} });
const bullet = t => new Paragraph({ children:[new TextRun({text:"•  "+t,size:20,color:DARK_GRAY})], spacing:{after:70} });

const headerTable = (name, sub) => new Table({
  width:{size:10240,type:WidthType.DXA}, layout:TableLayoutType.FIXED,
  borders:{top:{style:BorderStyle.NONE,size:0},bottom:{style:BorderStyle.NONE,size:0},left:{style:BorderStyle.NONE,size:0},right:{style:BorderStyle.NONE,size:0},insideHorizontal:{style:BorderStyle.NONE,size:0},insideVertical:{style:BorderStyle.NONE,size:0}},
  rows:[new TableRow({children:[new TableCell({
    width:{size:10240,type:WidthType.DXA}, shading:{type:ShadingType.CLEAR,fill:NAVY}, margins:{top:260,bottom:260,left:300,right:300},
    children:[
      new Paragraph({children:[new TextRun({text:name,bold:true,size:40,color:WHITE})],spacing:{after:60}}),
      new Paragraph({children:[new TextRun({text:sub,size:24,color:TEAL_LIGHT})]}),
    ]})]})],
});

const assessmentTable = rows => new Table({
  width:{size:10240,type:WidthType.DXA}, layout:TableLayoutType.FIXED, columnWidths:[3200,1800,5240],
  borders:{top:{style:BorderStyle.SINGLE,size:1,color:"AAAAAA"},bottom:{style:BorderStyle.SINGLE,size:1,color:"AAAAAA"},left:{style:BorderStyle.SINGLE,size:1,color:"AAAAAA"},right:{style:BorderStyle.SINGLE,size:1,color:"AAAAAA"},insideHorizontal:{style:BorderStyle.SINGLE,size:1,color:"AAAAAA"},insideVertical:{style:BorderStyle.SINGLE,size:1,color:"AAAAAA"}},
  rows:[
    new TableRow({children:[
      new TableCell({width:{size:3200,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill:NAVY},children:[new Paragraph({children:[new TextRun({text:"JD Parameter",bold:true,size:20,color:WHITE})]})]}),
      new TableCell({width:{size:1800,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill:NAVY},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Rating",bold:true,size:20,color:WHITE})]})]}),
      new TableCell({width:{size:5240,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill:NAVY},children:[new Paragraph({children:[new TextRun({text:"Evidence",bold:true,size:20,color:WHITE})]})]}),
    ]}),
    ...rows.map(a=>new TableRow({children:[
      new TableCell({width:{size:3200,type:WidthType.DXA},margins:{top:80,bottom:80,left:80,right:80},children:[new Paragraph({children:[new TextRun({text:a.param,bold:true,size:19,color:NAVY})]})]}),
      new TableCell({width:{size:1800,type:WidthType.DXA},margins:{top:80,bottom:80,left:40,right:40},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:a.stars,bold:true,size:20,color:GOLD}),new TextRun({text:a.score,italics:true,size:17,color:GRAY})]})]}),
      new TableCell({width:{size:5240,type:WidthType.DXA},margins:{top:80,bottom:80,left:80,right:80},children:[new Paragraph({children:[new TextRun({text:a.evidence,size:19,color:BLACK})]})]}),
    ]})),
  ],
});

const A = [
 {param:"Copilot Studio Development (Topic Routing, Generative Orchestration, Adaptive Cards)", stars:"★★★★★  ", score:"5.0/5",
  evidence:"Direct match — multi-topic agents built with topic routing and generative orchestration, adaptive cards for structured intake and confirmation, custom entities, and multi-agent design across two enterprise portfolio deployments."},
 {param:"Power Automate & Orchestration Workflows", stars:"★★★★★  ", score:"5.0/5",
  evidence:"Direct match — cloud flows connecting conversational agents to enterprise systems, plus orchestrated multistep workflows spanning intake, validation, escalation, and resolution with review checkpoints on sensitive transactions."},
 {param:"Custom Connectors & API Integrations (REST, OAuth 2.0, JSON Schema)", stars:"★★★★★  ", score:"5.0/5",
  evidence:"Direct match — custom connector built to an HRMS REST API, plus standard and premium connectors, OAuth 2.0, JSON Schema, and webhooks across enterprise integrations."},
 {param:"AI Agents, RAG & Knowledge Grounding", stars:"★★★★★  ", score:"5.0/5",
  evidence:"Direct match — RAG-based responses grounded on curated SharePoint and public-site knowledge sources with citations, achieving 85%+ answer accuracy in production and ~88% in UAT."},
 {param:"Governance, Security & Compliance (DLP, RBAC, ALM, Audit Logging)", stars:"★★★★★  ", score:"5.0/5",
  evidence:"Direct match — DLP policies, RBAC-scoped and managed environments, service-principal authentication, audit logging, responsible AI guardrails, and solution ALM across Dev/Test/Prod."},
 {param:"Human-in-the-Loop & Approval Gates", stars:"★★★★★  ", score:"5.0/5",
  evidence:"Direct match — Teams-based adaptive card approvals routing high-risk and exception cases to managers before commit, privileged-access approval gates, and low-confidence escalation to live agents."},
 {param:"Enterprise Systems Integration (Teams, SharePoint, ITSM/CRM/HRMS)", stars:"★★★★☆  ", score:"4.5/5",
  evidence:"Direct match — agents integrated with Microsoft Teams, SharePoint, ServiceNow, HRMS, and enterprise CRM/ITSM platforms for self-service across ITSM, HR, Finance, and Operations."},
 {param:"MCP Development (Model Context Protocol)", stars:"★★★★☆  ", score:"4.0/5",
  evidence:"Direct match — AI agents integrated with enterprise CRM/ITSM tools via MCP, enabling conversational ticket creation and assignment; MCP consumed as an integration layer rather than MCP servers or tools authored."},
 {param:"ServiceNow, Jira & Confluence Integrations", stars:"★★★☆☆  ", score:"3.5/5",
  evidence:"Partial match — ServiceNow deeply integrated via REST API and MCP for ticket creation, status lookup, and updates; Jira listed as a tool with no integration work described, and Confluence not present."},
 {param:"Dataverse", stars:"★★★☆☆  ", score:"3.0/5",
  evidence:"Partial match — Dataverse listed in the Power Platform stack and used in the HR Policy & Onboarding deployment; no data modeling, table design, or Dataverse-specific engineering described."},
 {param:"Technical Leadership, Mentoring & Code Reviews", stars:"★★★☆☆  ", score:"3.0/5",
  evidence:"Partial match — served as technical architect for enterprise AI agent deployments and coordinated development and QA teams through to production delivery; no mentoring, code reviews, or formal technical-governance ownership named."},
 {param:"Power Apps", stars:"★★☆☆☆  ", score:"2.5/5",
  evidence:"Partial match — Power Apps listed in the Power Platform skill set and four enterprise Power Platform initiatives delivered; no Power Apps canvas or model-driven app development described in any role or project."},
 {param:"Microsoft Foundry Orchestration", stars:"★☆☆☆☆  ", score:"1.0/5",
  evidence:"Gap — Azure OpenAI and LLM integration present, but no Microsoft Foundry orchestration, agent service, or Foundry-based deployment experience."},
];

const doc = new Document({sections:[{
 properties:{page:{size:{width:12240,height:15840,orientation:PageOrientation.PORTRAIT},margin:{top:900,bottom:900,left:1000,right:1000}}},
 children:[
  headerTable("RUPAM WADIBHASME","Copilot Studio Developer — Power Platform & AI Agent Orchestration  │  MBA, RTM Nagpur University"),
  sectionHeading("Professional Summary"),
  new Paragraph({children:[new TextRun({text:"Copilot Studio Developer with 4+ years in Power Platform and conversational AI development, designing enterprise AI agents on Microsoft Copilot Studio and integrating them with enterprise systems through Power Automate, custom connectors, REST APIs, and MCP. Hands-on across conversational flows, topic routing, generative orchestration, adaptive cards, knowledge source integration, and RAG-based grounded responses, with human-in-the-loop approval gates built in for high-impact actions. Delivers enterprise Power Platform solutions that meet governance and security compliance standards through DLP policies, RBAC, managed environments, and solution ALM.",size:21,color:DARK_GRAY})],spacing:{after:160}}),
  sectionHeading("Self Assessment"),
  assessmentTable(A),
  sectionHeading("Professional Experience"),

  jobTitle("Senior Analyst, Process Improvement & AI Automation — Magnit Global"),
  dateLine("India  |  Mar 2025 – Present"),
  bullet("Design and develop AI-powered conversational agents and automation on Microsoft Copilot Studio and Power Platform, integrated with Microsoft Teams and SharePoint for enterprise self-service."),
  bullet("Integrated AI agents with enterprise CRM/ITSM tools via MCP (Model Context Protocol), enabling conversational creation and assignment of tickets in platforms such as ServiceNow."),
  bullet("Build Power Automate cloud flows and API integrations connecting conversational agents to enterprise systems, using standard, premium, and custom connectors."),
  bullet("Implemented human-in-the-loop workflows with Teams-based adaptive card approvals, routing high-risk and exception cases to managers before an action is committed."),
  bullet("Enforced governance and security compliance through DLP policies, RBAC-scoped environments, service-principal authentication, and solution ALM across Dev/Test/Prod."),
  bullet("Delivered four enterprise-scale Power Platform initiatives: Birthday Notification, Manager Alerts, Work Analytics, and Interview Feedback systems."),
  bullet("Own troubleshooting and root-cause analysis for flow failures, connector authentication errors, and agent misrouting, maintaining stable production operations."),
  bullet("Achieved approximately 75% reduction in processing time, saving 20+ hours per week through intelligent automation; received a Spot Award for impact on business efficiency and enterprise platform adoption."),

  jobTitle("Lead AI Specialist, AI Solutions Architect — E42.ai"),
  dateLine("Pune, India (Remote)  |  Jan 2023 – Mar 2025"),
  bullet("Technical architect for enterprise conversational AI and AI agent deployments across ITSM, HR, Finance, and Operations."),
  bullet("Designed conversational flows and topic routing for multi-topic agents, including intent classification, entity extraction, slot filling, and fallback handling."),
  bullet("Architected RAG-based response systems with knowledge source integration over enterprise repositories, achieving 85%+ answer accuracy."),
  bullet("Built orchestrated multistep workflows covering intake, validation, escalation, and resolution, with human review checkpoints on sensitive transactions."),
  bullet("Deployed LLM-powered conversational copilots on Microsoft Teams enabling 24/7 self-service, reducing helpdesk load by 30–40%."),
  bullet("Delivered intelligent document processing agents for invoice processing, KYC validation, and bank statement reconciliation using OCR and NLP with automated matching and exception handling."),
  bullet("Managed LLM integration, prompt optimization, and model evaluation for accuracy and cost efficiency; coordinated development and QA teams through to production-ready delivery."),

  jobTitle("AI Use Case Specialist — E42.ai"),
  dateLine("Pune, India (Remote)  |  Jan 2022 – Jan 2023"),
  bullet("Identified and mapped conversational AI and automation opportunities across enterprise processes with ROI estimation."),
  bullet("Scoped AI agents for multistep operational tasks including data extraction, classification, and response generation."),

  jobTitle("Assistant Manager, Operations & Process Controls — HDFC Bank"),
  dateLine("Nagpur, India  |  Feb 2020 – Aug 2020"),
  bullet("Managed high-volume banking operations under strict SLA and compliance controls."),

  jobTitle("Assistant Manager, Operations & Process Controls — Axis Bank"),
  dateLine("Bhopal, India  |  Sep 2018 – Feb 2020"),
  bullet("Oversaw branch operations, escalation resolution, and internal process compliance."),

  sectionHeading("Copilot Studio Portfolio Projects"),

  jobTitle("Enterprise IT Service Desk Agent — Copilot Studio"),
  dateLine("Copilot Studio  |  Power Automate  |  Adaptive Cards  |  SharePoint Knowledge Sources  |  ServiceNow REST API  |  Microsoft Teams"),
  bullet("Built a multi-topic agent with topic routing and generative orchestration dispatching queries across access, hardware, software, and network topics, with adaptive cards for structured intake and confirmation."),
  bullet("Integrated SharePoint and public-site knowledge sources for RAG-based responses with citations, and connected Power Automate flows to the ServiceNow REST API for automated ticket creation, status lookup, and updates."),
  bullet("Added a human-in-the-loop approval gate in Teams for privileged access requests, keeping high-risk actions under human judgement."),
  bullet("Deflected approximately 40% of L1 tickets at first contact, saved around six hours per week of analyst effort, and cut average first-response time from hours to under a minute for in-scope topics."),

  jobTitle("HR Policy & Onboarding Copilot — Governed Enterprise Deployment"),
  dateLine("Copilot Studio  |  Custom Connector  |  HRMS REST API  |  Dataverse  |  DLP Policies  |  RBAC  |  Power BI"),
  bullet("Grounded the agent on curated SharePoint knowledge sources for RAG-based responses restricted by RBAC, so users retrieve only content they are entitled to see."),
  bullet("Built a custom connector to the HRMS REST API for leave balance and joining-formalities lookups, and designed conversational flows for onboarding checklists with adaptive card task tracking."),
  bullet("Applied DLP policies, managed environments, and audit logging for governance and security compliance, with low-confidence human-in-the-loop escalation to a live HR agent."),
  bullet("Tracked resolution and escalation trends in a Power BI conversation-analytics dashboard; reduced repetitive HR queries by approximately 35%, sustained around 88% response accuracy in UAT, and shortened new-hire onboarding query turnaround from one to two days to same-day."),

  sectionHeading("Education"),
  jobTitle("MBA, Operations & Finance"),
  dateLine("Rashtrasant Tukadoji Maharaj Nagpur University  |  Grade A  |  2020 – 2022"),
  jobTitle("B.E., Engineering"),
  dateLine("Nagpur University  |  2013 – 2017"),

  sectionHeading("Certifications"),
  bullet("Agentic Workflow (Jan 2026); Generative AI (Jan 2026); Chatbot Development (Jan 2026)."),
  bullet("Professional Scrum Master I (PSM I); Lean Six Sigma Green Belt."),
 ],
}]});

Packer.toBuffer(doc).then(b=>{fs.writeFileSync("/mnt/user-data/outputs/Rupam_Wadibhasme_CV_Senior_Developer.docx",b);console.log("written");});
