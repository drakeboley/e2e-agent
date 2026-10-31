# E2EBot (`e2e-agent.com`) — Terms of Service, SSRF Prohibition & Subscription Agreement

**Document ID:** `EPIC-E2EBOT-TERMS-10`  
**Effective Date:** October 12, 2026  
**Operating Entity:** Enterprise Picard LLC d/b/a E2EBot Cloud  
**Legal & Abuse Contact:** `support@e2e-agent.com` | **Billing Support:** `support@e2e-agent.com`

---

## 1. Acceptance of Terms & Account Security

By accessing or using E2EBot (`e2ebot`), provisioning an `e2e_live_` API key, or invoking the E2EBot Model Context Protocol (MCP), REST, or WebSocket interfaces, you agree to be bound by these Terms of Service. You are responsible for safeguarding your Bearer API credentials and ensuring all usage complies with your assigned tier quotas (`STARTER`, `PRO`, `AGENCY`, or `ENTERPRISE`).

---

## 2. Authorized Target Attestation & SSRF / CFAA Prohibition (18 U.S.C. § 1030)

> **AUTHORIZED TARGET ATTESTATION & SSRF PROHIBITION (18 U.S.C. § 1030):** Customer represents, warrants, and covenants that it owns or possesses explicit written authorization from the system owner to execute automated browser tests against every target URL submitted to E2EBot. E2EBot enforces strict Server-Side Request Forgery (SSRF) network egress controls blocking RFC 1918 private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback interfaces (`127.0.0.0/8`, `::1`), link-local/cloud metadata endpoints (`169.254.169.254`), and non-HTTP(S) protocols. Unauthorized scanning, credential stuffing, denial-of-service testing, or probing of third-party infrastructure violates the Computer Fraud and Abuse Act (18 U.S.C. § 1030) and will result in immediate account termination.

---

## 3. California Automatic Renewal Law (ARL — Cal. Bus. & Prof. Code § 17600 et seq.)

> **CALIFORNIA AUTOMATIC RENEWAL LAW (ARL) DISCLOSURE (CAL. BUS. & PROF. CODE § 17602):** Paid E2EBot subscriptions (`PRO` at $49/month, `AGENCY` at $199/month, and `ENTERPRISE` at $899/month) automatically renew at the end of each monthly or annual billing cycle at the then-current tier rate unless cancelled prior to the renewal date. By checking the affirmative consent box at checkout, you authorize recurring charges to your payment method. You may cancel your subscription at any time with one click via **Developer Portal → Pricing & Billing → Cancel Subscription (Self-Serve Billing Portal)** or by emailing `support@e2e-agent.com` (at least 24 hours before renewal to avoid the next period's charge).

---

## 4. Ephemeral Browser Execution & Data Ownership

> **EPHEMERAL BROWSER EXECUTION & ZERO-CREDENTIAL-RETENTION COVENANT:** E2EBot executes automated browser sessions in isolated, ephemeral sandboxed containers that are destroyed immediately upon test run completion. Authentication secrets, session cookies, bearer tokens, and test credentials supplied during execution are processed strictly in volatile memory (RAM), are redacted from all execution logs, DOM snapshots, and telemetry traces, are never persisted in plain text at rest, and are strictly excluded from training, fine-tuning, or improving any AI/ML models.

You retain 100% ownership of all application code, test specifications, and deploy previews inspected by E2EBot.

---

## 5. Service Level Agreement (SLA), Limitation of Liability & Governing Law

- **Enterprise SLA:** `ENTERPRISE` tier customers receive a 99.9% uptime SLA monitored continuously via `/health` and `/api/health`.
- **Limitation of Liability:** Except for breaches of Section 2 (Authorized Target Attestation & CFAA Indemnification), neither party's aggregate liability shall exceed the total fees paid by Customer to Enterprise Picard LLC in the twelve (12) months preceding the claim (or $100 USD for `STARTER` tier users).
- **Governing Law:** These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles.
