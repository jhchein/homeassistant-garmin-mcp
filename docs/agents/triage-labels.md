# Triage Labels

State labels (exactly one per triaged issue):

| Label | Meaning |
| --- | --- |
| `needs-triage` | Maintainer needs to evaluate |
| `needs-info` | Waiting on reporter |
| `ready-for-agent` | Fully specified; AFK agent can implement |
| `ready-for-human` | Needs human judgment or access |
| `wontfix` | Will not be actioned |

Category labels (exactly one per triaged issue):

| Label | Meaning |
| --- | --- |
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |

Create missing labels with:

```sh
gh label create needs-triage --color "#e4e669" --description "Maintainer needs to evaluate"
gh label create needs-info --color "#d876e3" --description "Waiting on reporter"
gh label create ready-for-agent --color "#0075ca" --description "Fully specified; agent can implement"
gh label create ready-for-human --color "#e99695" --description "Needs human judgment"
gh label create wontfix --color "#ffffff" --description "Will not be actioned"
gh label create bug --color "#d73a4a" --description "Something is broken"
gh label create enhancement --color "#a2eeef" --description "New feature or improvement"
```
