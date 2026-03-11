# Vision: How Many Stars

## Problem

GitHub doesn't give repository owners an aggregated view of their star counts across all public repos. Checking engagement means opening each repo individually, mentally summing numbers, and getting no sorted ranking. For someone with multiple public repos, this is mildly tedious — the kind of small friction that adds up over time when you're trying to gauge which projects are resonating.

This isn't a crisis. It's a quality-of-life gap that was worth a few hours to close.

## Success Headline

"It works. Star counts load, totals aggregate, repos sort by popularity — deployed and live at 0xsalt.github.io/how-many-stars."

## Target User

Chris, primarily. The tool is hardcoded to the 0xsalt GitHub account and was built as a personal utility. It's feature-complete at its current scope.

Secondarily: any GitHub user who wants this same view for their own account and is willing to clone it, swap the username, and deploy.

## What This IS

A feature-complete personal utility. A single-page dashboard that fetches public repo data from the GitHub API, sorts by star count, shows per-repo stars plus a total, and links out to each repo. Built with TypeScript on Bun, deployable to GitHub Pages, zero external dependencies beyond Bun builtins.

**Open question on productization**: There is a version of this that becomes a lightweight public tool — accept any GitHub username as a parameter, add a caching layer to avoid the 60-request unauthenticated rate limit, deploy to a persistent URL, maybe add basic auth support for higher limits. The market for this is thin (GitHub does expose this data in their own UI), but the value prop for developers who want a fast external view of their own portfolio is real. The work to get there from the current state is modest: parameterize the username, add a cache layer, and write a one-page landing. Whether that's worth doing is an open question.

## What This Is NOT

- Not a GitHub analytics platform. It shows star counts, not traffic, not clone counts, not contributor graphs.
- Not a multi-user SaaS. The current architecture is hardcoded to one account.
- Not a replacement for GitHub's own interface. It is a convenience view, not a competing product.
- Not a priority for active development. This is a hobby utility that reached its intended scope.

## Anti-Drift

**Do not add features out of scope-creep.** Contributor stats, issue counts, traffic data, fork counts — none of these were the point. If the tool gets more ambitious, it risks becoming something that requires maintenance for problems that aren't actually painful.

**The productization question should be answered as a decision, not a slow drift.** Either commit to making it multi-user and publicly useful (with a caching layer and parameterized username), or leave it as the personal utility it is. The worst outcome is half-finishing a productization pass that makes the code more complex without making it more useful.

**Rate limiting is a known issue, not a bug to race to fix.** The 60 req/hour GitHub API limit is only a problem if the tool is used by many people or needs very frequent refresh. For a personal tool used occasionally, it's fine.
