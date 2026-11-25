# BeMoreFab impact page (draft)

A web page that shows BeMoreFab's impact figures. It is built to sit inside the charity's WordPress site in a frame.

**Status: draft, in two versions for BeMoreFab to choose between.** The Primary Virtual School figures are real (Pencil Spaces, 1 September to 25 November 2026). Every other BeMoreFab figure is a made-up sample. The page shows a "Draft" banner while `"sample": true` is set in the data file, and search engines are asked not to list it.

| Version | Address | Look |
| --- | --- | --- |
| Plain | `/` | Brand colours and fonts, no characters |
| Fab Fox World | `/fox/` | Follows the Fab Fox World guide: characters, rooms, bunting, ink outlines |

Both versions read the same data file and use the same `app.js`, so the figures can never differ between them.

## What is in this folder

| File | What it is |
| --- | --- |
| `index.html`, `styles.css` | The plain version: wording, sections, national figures with sources |
| `fox/index.html`, `fox/fox.css` | The Fab Fox World version |
| `fox/art/` | BeMoreFab's own artwork, taken from the Fab App. Nothing in it is newly drawn |
| `assets/logo.webp` | The #bemorefab logo |
| `app.js` | Reads the data file and draws the figures, bars and charts for both versions |
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
| 2 | Primary Virtual School minutes and lessons come from Pencil Spaces (Sessions, calls with at least one participant) |
| 3 | The totals are written to `data/public-feed.json` in the shape below |
| 4 | The file is saved to this repository. The page picks it up within about ten minutes |

Steps 3 and 4 are not automated yet. Until they are, the file is edited by hand.

## The data file

| Field | Meaning |
| --- | --- |
| `sample` | `true` shows the "Draft" banner. Set to `false` only when every figure is real and signed off |
| `sample_note` | The sentence shown in the banner, saying which figures are real and which are samples |
| `as_of` | The date the figures were taken, as `YYYY-MM-DD` |
| `headline.children_supported_now` | Children and young people with any support open today |
| `headline.education_children_now` | Children and young people with education support open today |
| `headline.pvs_minutes_school_year` | Minutes of live Primary Virtual School lessons taught since 1 September. The page works out hours from this |
| `headline.ff_siblings_now` | Brothers and sisters in Freddie's Friends today |
| `registrations_by_school_year` | One entry per school year: `label`, `value` |
| `education.by_support_type` | Children learning with us now, by type of support |
| `education.children_past_12_months`, `education.journeys_started_past_12_months` | Education totals for the past 12 months |
| `pvs.lessons_school_year` | Live lessons taught since 1 September |
| `pvs.wellbeing_min_share` | The smallest share of teaching time given to wellbeing activities (0.3333 = a third). The page shows it as "hours or more", rounded down |
| `pvs.minutes_by_month` | Minutes taught in each month of this school year |
| `freddies_friends.gifts_by_month`, `freddies_friends.gifts_past_12_months` | Gifts and treats sent |
| `regions` | Children supported now, by UK region |
| `links.register`, `links.refer` | Full `https://` addresses for the two buttons at the bottom. Leave empty to hide a button |

Privacy rules for the file:

1. Round every regional figure to the nearest 5.
2. Where a count of children is under 5, write `null`. The page shows "Fewer than 5".
3. As a backstop, the page also hides any count from 1 to 4 that reaches it in a breakdown.
4. Update regional figures monthly, not daily, so day-to-day changes cannot be traced to one family.

## The Fab Fox World version and the guide

| Guide rule | How the page keeps it |
| --- | --- |
| Ink brown outline, never black | Every outline and all text is `#2B1A12` |
| Colours from the table, flat | `fox.css` uses only colours from the guide's table. No gradients or shadows |
| Characters keep their look and names | Only the Fab App's own artwork is used, unedited |
| One character per job | Miss Bell: teaching. Bramble and Moss: learning together. Nurse Willow: wellbeing. Mrs Lark: where we stop (privacy). Mr Elder: what changes for children |
| Fab's cancer story belongs to the books only | The "Why we are needed" section has no characters, and no wording ties Fab to cancer |
| Nothing new without sign-off | Using the characters on this page is a new use. It needs BeMoreFab's sign-off before launch |

## Putting it on the WordPress page

Add a Custom HTML block where the dashboard should appear (replace the address with this site's address, and add `fox/` to it for the Fab Fox World version):

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

- [ ] Choose a version (plain or Fab Fox World) and remove the link to the other from the banner
- [ ] Real figures in `data/public-feed.json`, signed off, with `"sample": false`
- [ ] Agree which Pencil Spaces sessions count as Primary Virtual School lessons
- [ ] Wording on the page checked by BeMoreFab
- [ ] Fab Fox World version: character uses signed off against the guide
- [ ] `links.register` and `links.refer` filled in
- [ ] Remove the `noindex` line from the page
- [ ] Confirm BeMoreFab's Canada Tawa licence covers use on a public web page
- [ ] Add a line about this page to the website privacy notice (it is served by GitHub)
- [ ] Move the repository to a BeMoreFab-owned GitHub organisation

## National figures

The "Why we are needed" figures come from Cancer Research UK and CCLG and are written into both pages with links to their sources. Check them once a year.
