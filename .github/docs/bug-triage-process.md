# Bug Triage Process

**Last Updated:** [Date]  
**Owner:** Development Team

---

## Overview

This document outlines the systematic process for triaging, prioritizing, and assigning bugs reported during testing and beta phases.

---

## Triage Schedule

### Daily Standup (Quick Triage)
- **Time:** Every morning at [Time]
- **Duration:** 5-10 minutes
- **Focus:** Review critical/high severity bugs only

### Weekly Triage Meeting
- **Time:** Every [Day] at [Time]
- **Duration:** 30-60 minutes
- **Focus:** Comprehensive review of all new bugs

---

## Triage Roles

| Role | Responsibility |
|------|----------------|
| **Triage Lead** | Facilitates meeting, makes final priority decisions |
| **Product Owner** | Provides business context and user impact assessment |
| **Tech Lead** | Assesses technical complexity and effort |
| **QA Lead** | Provides testing context and reproduction steps |

---

## Triage Workflow

### Step 1: Review New Bugs
- Filter: `is:issue is:open label:bug -label:status-triaged`
- Review each bug submitted since last triage

### Step 2: Validate Bug Report
**Check for completeness:**
- [ ] Clear description
- [ ] Steps to reproduce provided
- [ ] Expected vs actual behavior documented
- [ ] Environment details included
- [ ] Screenshots/videos attached (if applicable)

**If incomplete:**
- Add comment requesting missing information
- Add label: `needs-more-info`
- Skip to next bug (will retriage once info provided)

### Step 3: Assign Severity
Based on impact to users and system:

#### Critical
- **Definition:** Production down, data loss, security vulnerability, complete feature failure
- **Examples:**
  - Application crashes on load
  - Data corruption or loss
  - Security breach or exploit
  - Payment processing failure
- **Response Time:** Immediate (within 1 hour)

#### High  
- **Definition:** Major feature broken, significant user impact, workaround exists but difficult
- **Examples:**
  - Core feature not working
  - Multiple users affected
  - Login issues (but can use password reset)
- **Response Time:** Within 24 hours

#### Medium
- **Definition:** Feature partially broken, moderate impact, easy workaround available
- **Examples:**
  - Minor feature malfunction
  - UI rendering issues
  - Performance degradation
- **Response Time:** Within current sprint (1-2 weeks)

#### Low
- **Definition:** Minor issue, cosmetic problem, minimal user impact
- **Examples:**
  - Typos or text formatting
  - Minor UI misalignment
  - Low-priority feature requests
- **Response Time:** Next sprint or backlog

**Action:** Add appropriate `severity-*` label

### Step 4: Assign Priority
Based on business urgency and sprint capacity:

#### P0 (Drop Everything)
- Must be fixed immediately
- Typically critical severity bugs
- Halt other work if necessary

#### P1 (This Sprint)
- Must be fixed in current sprint
- Typically high or critical severity

#### P2 (Next Sprint)
- Fix in next sprint
- Typically medium severity

#### P3 (Backlog)
- Fix when capacity allows
- Typically low severity

**Action:** Add appropriate `priority-*` label

### Step 5: Assign to Team Member
**Assignment Criteria:**
- Technical expertise required
- Current workload
- Availability
- Priority level

**Deadlines by Severity:**
- Critical: Assign immediately, deadline within 24 hours
- High: Assign within 4 hours, deadline within 3-5 days
- Medium: Assign within 1 day, deadline within current sprint
- Low: Assign when capacity available, deadline flexible

**Action:**
1. Assign team member in GitHub
2. Set milestone (current sprint or future sprint)
3. Add due date if applicable
4. Add comment with context/guidance

### Step 6: Add to Project Board
- Move bug from "New" to "Triaged" column in Bug Tracking project
- Ensure all labels are correctly applied

### Step 7: Mark as Triaged
**Action:** Add `status-triaged` label

---

## Triage Decision Matrix

| Severity | User Impact | Business Impact | Priority Guidance |
|----------|-------------|-----------------|-------------------|
| Critical | High | High | P0 - Immediate |
| Critical | High | Medium | P0 or P1 |
| High | High | High | P1 - This Sprint |
| High | Medium | High | P1 - This Sprint |
| High | Low | Medium | P2 - Next Sprint |
| Medium | Any | Medium | P2 - Next Sprint |
| Medium | Low | Low | P3 - Backlog |
| Low | Any | Any | P3 - Backlog |

---

## Special Cases

### Duplicate Bugs
1. Search existing issues before triaging
2. If duplicate found:
   - Close new bug as duplicate
   - Link to original issue
   - Add `duplicate` label
   - Merge any additional context into original

### Cannot Reproduce
1. Add comment asking reporter for more details
2. Add `cannot-reproduce` label
3. Wait 7 days for response
4. If no response, close with explanation

### Not a Bug (Feature Request)
1. Change label from `bug` to `enhancement`
2. Move to feature backlog
3. Add comment explaining it's not a bug

### Security Issues
1. **DO NOT discuss in public comments**
2. Immediately notify security team
3. Add `security` label
4. Mark as P0 Critical
5. Follow security incident response process

---

## Post-Triage Actions

### Triage Lead
- [ ] Update triage notes in meeting doc
- [ ] Send summary email to team
- [ ] Update metrics dashboard

### Assigned Developers
- [ ] Review assigned bugs within 24 hours
- [ ] Move to "In Progress" when starting work
- [ ] Ask questions if clarification needed

---

## Triage Metrics to Track

Track these in weekly metrics report:
- Number of bugs triaged
- Average triage time
- Bugs awaiting more info
- Critical/High bugs opened vs closed
- Triage backlog size

---

## Escalation Process

If you cannot determine severity or priority:
1. Tag Product Owner and Tech Lead in comment
2. Discuss in Slack #dev-team channel
3. Escalate to Triage Lead for final decision

---

## Example Triage Session

```
Bug #45: Login button doesn't work on mobile Safari

1. Validate: ✅ Has repro steps, screenshots, environment
2. Severity: HIGH (login is core functionality, affects mobile users)
3. Priority: P1 (needs to work for mobile beta users)
4. Assign: @jane-dev (mobile expert, has capacity)
5. Deadline: End of current sprint (3 days)
6. Project: Move to "Triaged" column
7. Labels: bug, severity-high, priority-p1, source-beta, status-triaged
```

---

## Questions?

Contact the Triage Lead or post in #dev-team Slack channel.