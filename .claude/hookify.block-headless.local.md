---
name: block-headless-mode
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: scrapers/
  - field: new_text
    operator: regex_match
    pattern: headless:\s*true|headless:\s*'new'
action: block
---

**Headless mode detected in scraper code. Operation blocked.**

ZARA/COS crawlers require headed mode (headless: false) to bypass Akamai bot detection.
Setting headless: true will cause "Access Denied" errors.
