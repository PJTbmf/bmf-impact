# BeMoreFab impact page (draft)

A single web page that shows BeMoreFab's impact figures. It is built to sit inside the charity's WordPress site in a frame.

**Status: first draft. Every BeMoreFab figure on the page is a made-up sample.** The page shows a "Sample numbers" banner while `"sample": true` is set in the data file, and search engines are asked not to list it.

## What is in this folder

| File | What it is |
| --- | --- |
| `index.html` | The page: wording, sections and the national figures with their sources |
| `styles.css` | Fab Fox colours, Canda headlines, Aleo text |
| `app.js` | Reads the data file and draws the figures, bars and charts |
| `data/public-feed.json` | The only place BeMoreFab's figures live. Counts only |
| `fonts/` | Aleo and Canda, the same files the Fab App uses |

## The one rule

This repository is public, and so is every past version of every file in it.

| Never put here | Why |
| --- | --- |
| A row per child, a name, a date of birth, a postcode | Public for good, even if deleted later |
| The Beacon API key or any password | Same |
| A count of children under 5 | Small numbers can point to a family |

Only finished totals go in `data/public-feed.json`.

## How the figures get here

| Step | What happens |
| --- | --- |
| 1 | Power BI Desktop refreshes from Beacon and works out the totals (the same report that feeds Fabbie) |
| 2 | The totals are written to `data/public-feed.json` in the shape below |
| 3 | The file is saved to this repository. The page picks it up within about ten minutes |

Step 2 and step 3 are not automated yet. Until they are, the file is edited by hand.

## The data file

| Field | Meaning |
| --- | --- |
| `sample` | `true` shows the "Sample numbers" banner. Set to `false` only when the figures are real and signed off |
| `as_of` | The date the figures were taken from Beacon, as `YYYY-MM-DD` |
| `headline.children_supported_now` | Children and young people with any support open today |
| `headline.education_children_now` | Children and young people with education support open today |
| `headline.pvs_minutes_school_year` | Minutes of Primary Virtual School lessons taught since 1 September |
| `headline.ff_siblings_now` | Brothers and sisters in Freddie's Friends today |
| `registrations_by_school_year` | One entry per school year: `label`, `value` |
| `education.by_support_type` | Children learning with us now, by type of support |
| `education.children_past_12_months`, `education.journeys_started_past_12_months` | Education totals for the past 12 months |
| `pvs.minutes_by_month` | Minutes taught in each of the last 12 months |
| `pvs.children_school_year` | Children who have joined a lesson this school year |
| `freddies_friends.gifts_by_month`, `freddies_friends.gifts_past_12_months` | Gifts and treats sent |
| `regions` | Children supported now, by UK region |
| `links.register`, `links.refer` | Full `https://` addresses for the two buttons at the bottom. Leave empty to hide a button |

Privacy rules for the file:

1. Round every regional figure to the nearest 5.
2. Where a count of children is under 5, write `null`. The page shows "Fewer than 5".
3. As a backstop, the page also hides any count from 1 to 4 that reaches it in a breakdown.
4. Update regional figures monthly, not daily, so day-to-day changes cannot be traced to one family.

## Putting it on the WordPress page

Add a Custom HTML block where the dashboard should appear (replace the address with this site's address):

```html
<iframe id="bmf-impact" src="https://ACCOUNT.github.io/bmf-impact/" title="BeMoreFab impact figures"
        style="width:100%;border:0;height:4800px" loading="lazy"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://ACCOUNT.github.io') return;
    if (e.data && e.data.type === 'bmf-impact-height') {
      document.getElementById('bmf-impact').style.height = e.data.height + 'px';
    }
  });
</script>
```

The script makes the frame as tall as the page inside it, so there is no second scroll bar. If WordPress removes the script, the frame still works at the fixed height.

## Hosting (GitHub Pages)

Settings → Pages → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)` → Save.

## Before launch

- [ ] Real figures in `data/public-feed.json`, signed off, with `"sample": false`
- [ ] Wording on the page checked by BeMoreFab
- [ ] `links.register` and `links.refer` filled in
- [ ] Remove the `noindex` line from `index.html`
- [ ] Confirm BeMoreFab's Canada Tawa licence covers use on a public web page
- [ ] Add a line about this page to the website privacy notice (it is served by GitHub)
- [ ] Move the repository to a BeMoreFab-owned GitHub organisation

## National figures

The "Why we are needed" figures come from Cancer Research UK and CCLG and are written into `index.html` with links to their sources. Check them once a year.
