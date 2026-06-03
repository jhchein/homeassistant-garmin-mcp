# Issue Tracker

GitHub Issues. Use the `gh` CLI.

```sh
# List open issues
gh issue list

# View a specific issue
gh issue view <number>

# Create a new issue
gh issue create --title "..." --body "..." --label needs-triage

# Add or remove labels
gh issue edit <number> --add-label ready-for-agent
gh issue edit <number> --remove-label needs-triage
```

Apply `needs-triage` on all new issues created by agents.
