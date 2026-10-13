# E2EBot (`e2ebot.dev`) — Platform Privacy Policy & Ephemeral Browser Execution Covenant

**Document ID:** `EPIC-E2EBOT-PRIVACY-09`  
**Effective Date:** October 12, 2026  
**Operating Entity:** Enterprise Picard LLC d/b/a E2EBot Cloud  
**Privacy Contact:** `privacy@enterprisepicard.com`

---

## 1. Ephemeral Browser Execution & Zero-Credential-Retention Covenant

> **EPHEMERAL BROWSER EXECUTION & ZERO-CREDENTIAL-RETENTION COVENANT:** E2EBot executes automated browser sessions in isolated, ephemeral sandboxed containers that are destroyed immediately upon test run completion. Authentication secrets, session cookies, bearer tokens, and test credentials supplied during execution are processed strictly in volatile memory (RAM), are redacted from all execution logs, DOM snapshots, and telemetry traces, are never persisted in plain text at rest, and are strictly excluded from training, fine-tuning, or improving any AI/ML models.

---

## 2. Information We Collect & Process

1. **Account & Multi-Tenant Identity Data:**
   - Subscriber email address, organization/workspace `tenantId`, and active subscription tier (`STARTER`, `PRO`, `AGENCY`, `ENTERPRISE`).
   - Cryptographic SHA-256 hashes of `e2e_live_` API keys (`keyHash`) and non-sensitive prefixes (`keyPrefix`). Plaintext API secrets are returned once at generation time and are never stored at rest.
2. **Billing & Payment Data:**
   - All payment card details and recurring subscription instruments are processed directly by **Stripe, Inc.** E2EBot stores only tokenized `stripeCustomerId` and `stripeSubscriptionId` references required for ledger reconciliation and self-serve cancellation.
3. **Ephemeral Test Execution Telemetry:**
   - Target deploy-preview URLs, HTTP status codes, execution duration (`durationMs`), and redacted console/network error counts needed for monthly quota metering.
   - Browser cookies, `localStorage`, `sessionStorage`, and authentication headers generated during Puppeteer or Cypress runs exist solely inside an isolated `BrowserContext` in RAM and are purged immediately (`0 hours` retention) when the test run completes.

---

## 3. Strict AI Model Training Exclusion

Enterprise Picard LLC **never** uses your private staging URLs, deploy-preview DOM trees, screenshots, test specs, or execution logs to train, fine-tune, evaluate, or improve any foundation, third-party, or proprietary AI/ML models.

---

## 4. Data Retention & Cryptographic Erasure Schedule

| Data Category | Retention Period | Disposal / Purge Mechanism |
| :--- | :--- | :--- |
| **Ephemeral Browser Context (Cookies, Storage, Auth Headers)** | **0 seconds post-run** (Volatile RAM only) | Immediate `BrowserContext.close()` & container teardown in `finally` block |
| **API Keys (`e2e_live_`)** | Active until revoked by Tenant | Stored exclusively as SHA-256 hash; immediate revocation via Portal or API |
| **Quota & Billing Audit Ledger** | Duration of active subscription + statutory tax retention | Encrypted at rest; purged upon verified erasure request |

---

## 5. GDPR, CCPA/CPRA & Data Subject Rights

- **GDPR (EEA/UK):** Processed under Article 6(1)(b) (Contractual Necessity) and Article 6(1)(f) (Legitimate Interest in securing multi-tenant infrastructure). You may exercise Articles 15–20 rights (Access, Rectification, Erasure, Portability) at any time.
- **CCPA / CPRA (California):** We do not "sell" or "share" personal information for cross-context behavioral advertising.
- **Exercising Rights:** Submit requests to `privacy@enterprisepicard.com`.
