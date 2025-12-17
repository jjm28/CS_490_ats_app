# Bug Tracking Guidelines

**Last Updated:** [Date]  
**For:** All Team Members (Developers, QA, Product, Beta Users)

---

## Quick Start

1. **Found a bug?** → Report it using the Bug Report template
2. **Fixing a bug?** → Follow the resolution workflow
3. **Testing a fix?** → Follow the verification process
4. **Closing a bug?** → Add verification notes

---

## How to Report a Bug

### Step 1: Check if Bug Already Exists
**Before creating a new issue:**
- Search existing issues: `is:issue label:bug [your search terms]`
- Check both open and closed bugs
- If found, add your information as a comment instead

### Step 2: Create Bug Report
1. Go to **Issues** tab in GitHub
2. Click **New Issue**
3. Select **Bug Report** template
4. Fill out ALL sections completely

### Step 3: Required Information

#### Bug Description
- **Clear, concise summary** of the issue
- What is broken or not working as expected

#### Severity (Select ONE)
- ☐ **Critical** - Production down, data loss, security issue
- ☐ **High** - Major feature broken, significant impact
- ☐ **Medium** - Feature partially broken, moderate impact
- ☐ **Low** - Minor issue, cosmetic, low impact

**Not sure?** Ask yourself:
- How many users are affected?
- Can they work around it?
- Is the app unusable?

#### Priority (Select ONE)
- ☐ **P0** - Drop everything, fix immediately
- ☐ **P1** - Fix this sprint
- ☐ **P2** - Fix next sprint
- ☐ **P3** - Backlog

**When in doubt:** Leave priority blank, triage team will assign

#### Steps to Reproduce
**Be specific!** Write step-by-step instructions:
```
Good Example:
1. Log in as admin user
2. Navigate to Settings > Users
3. Click "Add New User" button
4. Fill in name: "Test User", email: "test@example.com"
5. Click "Save"
6. Error message appears: "Invalid email"

Bad Example:
- User creation doesn't work
```

#### Expected vs Actual Behavior
- **Expected:** What SHOULD happen
- **Actual:** What DOES happen

#### Environment Details
- Browser/Device (e.g., Chrome 120, iPhone 14)
- Operating System (e.g., Windows 11, macOS Sonoma)
- App Version or commit hash
- User role (e.g., admin, regular user, guest)

#### Screenshots/Videos
- **Always include when possible!**
- Show the bug happening
- Include error messages in console (F12)
- Mark up images to highlight the issue

#### Source (Where found)
- ☐ QA Testing
- ☐ Beta Users
- ☐ Production
- ☐ Other

### Step 4: Submit
Click **Submit new issue**

The bug will be automatically added to the Bug Tracking project board.

---

## Bug Resolution Workflow

### For Developers Assigned to Bugs

#### 1. Acknowledge Assignment (Within 24 hours)
- Add comment: "Working on this, ETA: [date]"
- Move bug to **In Progress** column in project board
- Add `status-in-progress` label

#### 2. Reproduce the Bug
- Follow the reproduction steps exactly
- If you cannot reproduce:
  - Add comment asking for clarification
  - Add `cannot-reproduce` label
  - Wait for reporter response

#### 3. Fix the Bug
- Create a feature branch: `fix/bug-[issue-number]-short-description`
  - Example: `fix/bug-123-login-button`
- Write tests to verify the fix
- Commit with reference to issue: `Fix #123: Resolve login button issue on mobile Safari`

#### 4. Create Pull Request
- Link to the bug issue in PR description: `Closes #123`
- Describe what you changed and why
- Request review from team member
- Add screenshots/videos showing the fix working

#### 5. After PR is Merged
- Move bug to **In Review** column
- Add `status-needs-verification` label
- Tag QA or reporter: "@qa-team Ready for verification"

---

## How to Verify Bug Fixes

### For QA Testers

#### 1. Verify in Staging/Test Environment
- Wait for deployment to staging
- Follow original reproduction steps
- Expected result: Bug should NOT occur

#### 2. Test Edge Cases
- Try variations of the original steps
- Test related functionality
- Ensure fix didn't break anything else

#### 3. Document Verification

**If Fix Works:** ✅
Add comment:
```
✅ Verified Fixed in Staging

- Tested: [Date and Time]
- Tester: @your-name
- Environment: Staging/Test URL
- Result: Bug no longer reproduces
- Also tested: [Related scenarios]

Ready for production deployment.
```

**If Fix Doesn't Work:** ❌
Add comment:
```
❌ Verification Failed

- Tested: [Date and Time]
- Issue: Bug still reproduces
- Steps: [What you did]
- Result: [What happened]
- Screenshots: [Attach]

Moving back to In Progress.
```
- Remove `status-needs-verification` label
- Move back to **In Progress** column
- Assign back to developer

#### 4. Verify in Production
**After production deployment:**
- Test in actual production environment
- Use same steps as staging verification

---

## How to Close a Bug

### Closing Criteria (ALL must be met)
- ✅ Fix has been merged to main branch
- ✅ Fix has been verified in staging
- ✅ Fix has been deployed to production
- ✅ Fix has been verified in production
- ✅ No regression issues found

### Closing Process

#### 1. Add Verification Notes
**Required format:**
```
✅ VERIFIED FIXED IN PRODUCTION

Verification Details:
- Production Deploy Date: [Date]
- Verified By: @your-name
- Verification Date: [Date and Time]
- Production URL tested: [URL]
- Result: Bug confirmed resolved in production
- No regressions observed

Additional Notes:
[Any relevant context, browser/device tested, etc.]
```

#### 2. Apply Labels
- Add `verified-production` label
- Remove `status-needs-verification` label

#### 3. Move in Project Board
- Move to **Closed** column

#### 4. Close the Issue
- Click **Close issue** button
- GitHub will auto-link to the PR that fixed it

---

## Bug Lifecycle Summary

```
[Reported] 
    ↓
[New] → Waiting for triage
    ↓
[Triaged] → Severity/priority assigned, assigned to developer
    ↓
[In Progress] → Developer working on fix
    ↓
[In Review] → PR submitted, code review happening
    ↓
[Needs Verification] → Merged to main, ready for QA testing
    ↓
[Verified in Staging] → QA confirmed fix works in test environment
    ↓
[Deployed to Production] → Fix live for users
    ↓
[Verified in Production] → QA confirmed fix works in production
    ↓
[Closed] → Bug fully resolved with verification notes
```

---

## Best Practices

### For Everyone

**DO:**
- ✅ Search before creating duplicate bugs
- ✅ Provide complete information
- ✅ Include screenshots and environment details
- ✅ Be respectful and professional
- ✅ Follow up on requests for more info
- ✅ Verify fixes thoroughly

**DON'T:**
- ❌ Report feature requests as bugs
- ❌ Report multiple issues in one bug
- ❌ Skip reproduction steps
- ❌ Close bugs without verification
- ❌ Assign severity based on personal preference

### For Developers

**DO:**
- ✅ Acknowledge assignment quickly
- ✅ Ask questions if unclear
- ✅ Reference issue number in commits
- ✅ Write tests for your fix
- ✅ Update documentation if needed

**DON'T:**
- ❌ Mark bugs as fixed without testing
- ❌ Fix bugs without creating a PR
- ❌ Ignore edge cases
- ❌ Close bugs yourself (let QA verify)

### For QA/Testers

**DO:**
- ✅ Test beyond the original reproduction steps
- ✅ Check for regressions
- ✅ Document verification thoroughly
- ✅ Reopen if fix doesn't work
- ✅ Test in production before closing

**DON'T:**
- ❌ Verify without actually testing
- ❌ Close bugs without production verification
- ❌ Skip documentation

---

## Common Scenarios

### Scenario 1: Bug Cannot Be Reproduced
**Developer adds comment:**
> "I followed the steps but cannot reproduce this. Can you provide a video or more details about your environment?"

**Reporter should:**
- Provide additional details or video
- Try to reproduce again themselves
- Update environment information

### Scenario 2: Bug is Actually a Feature Request
**Triage lead will:**
- Remove `bug` label
- Add `enhancement` label
- Move to feature backlog
- Explain in comment

### Scenario 3: Bug Reappears After Being Fixed
**Anyone who finds it should:**
- Comment on the original closed bug
- Provide new reproduction steps
- Tag the developer who fixed it
- Triage team will decide to reopen or create new bug

### Scenario 4: Critical Production Bug
**Reporter should:**
- Mark as **Critical severity** and **P0 priority**
- Immediately notify team in Slack
- Provide as much detail as possible quickly
- Stay available for follow-up questions

---

## Labels Reference

| Label | Meaning |
|-------|---------|
| `bug` | This is a bug (vs feature request) |
| `severity-critical` | Production down, data loss, security |
| `severity-high` | Major feature broken |
| `severity-medium` | Partial feature broken |
| `severity-low` | Minor/cosmetic issue |
| `priority-p0` | Drop everything |
| `priority-p1` | Fix this sprint |
| `priority-p2` | Fix next sprint |
| `priority-p3` | Backlog |
| `status-triaged` | Has been reviewed by triage team |
| `status-in-progress` | Developer working on it |
| `status-needs-verification` | Ready for QA testing |
| `verified-production` | Confirmed fixed in production |
| `source-testing` | Found during QA |
| `source-beta` | Reported by beta users |
| `source-production` | Found in live production |
| `cannot-reproduce` | Unable to reproduce bug |
| `needs-more-info` | Need more details from reporter |
| `duplicate` | Duplicate of another bug |

---

## Getting Help

**Questions about:**
- **Reporting bugs:** Ask in #qa-team channel
- **Bug severity/priority:** Ask Triage Lead
- **Fixing bugs:** Ask Tech Lead or in #dev-team
- **Verification process:** Ask QA Lead

---

## Related Documents

- [Bug Triage Process](bug-triage-process.md)
- [Bug Metrics Report Template](bug-metrics-report.md)
- Bug Report Template: `.github/ISSUE_TEMPLATE/bug_report.md`