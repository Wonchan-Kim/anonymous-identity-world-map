# SecureW2 Android profile map

Checked: 11 September 2026.

The map uses the existing site's metric: the percentage of profiles with neither an explicit outer-identity nor anonymous-identity field. SecureW2 XML uses `outerIdentity` and `anonymousIdentity`; matching is case-insensitive and limited to EAP configuration blocks. An explicitly empty field counts as present, as this is a field-presence metric, not a test of the value or runtime behavior.

## Coverage

| Scope | Countries | Profiles | YES | NO | Missing % |
|---|---:|---:|---:|---:|---:|
| Universities and higher-education colleges | 10 | 160 | 15 | 145 | 90.62 |

This research focuses on universities. Tertiary colleges are included; institutions called College that provide primary/secondary education are not. K–12 schools, school districts, secondary vocational education, corporate organizations and UCAR are excluded from the map and all SecureW2 downloads on this site. The resulting higher-education sample is curated; it does not reproduce the original geteduroam/CAT UniRank sampling frame. The field-presence metric is shared, but collection dates and discovery coverage differ.

The source audit started with 217 rows. Three HTTP/HTTPS duplicates were removed and eight profiles from six additional institutions were added. After excluding unavailable, non-EAP, demo/test and non-higher-education records, 160 profiles remain in the published university sample. The unit is a portal/profile, not a unique university or EAP block. Multiple EAP blocks within one profile do not increase its weight.

Countries are the institution's home country, not a claim about the location of every deployed network. The profile's organization domain and the reviewed country assignment are retained in [country assignments](../data/securew2_country_assignments.csv). UCL University College is in Denmark, not the United Kingdom; Algonquin College is in Canada. Pymble Ladies College and mboRijnland are excluded because they are not tertiary institutions.

Grey countries mean no eligible sampled profiles, not zero missing identity fields. The sample is not an exhaustive global census. A publicly available profile does not prove that it is the currently deployed production configuration. Missing fields do not prove runtime username exposure.

## Downloads and evidence

- [University and tertiary-college portal records](../data/securew2_reviewed_2026-09-11.csv)
- [Individual EAP configuration blocks](../data/securew2_eap_scopes_2026-09-11.csv)
- [University map data](../data/securew2.json)
- Country detail rows link to the downloaded XML and original portal.

## Additional institution sources

- [Dartmouth College](https://wifi.dartmouth.edu/): Dartmouth and DCAD
- [University of Delaware](https://www1.udel.edu/getstarted): eduroam_TLS
- [Evangel University](https://wifi.evangel.edu/): EVANGELw2
- [Augustana University](https://cloud.securew2.com/public/56976/Groups/Augustana_University/): Campus WiFi Secure
- [Augustana College](https://www.augustana.edu/wireless): ACStaff and ACStudents
- [College of Charleston](https://cloud.securew2.com/public/19195/cofc-secure/): cofc-secure, whose portal describes eduroam onboarding

Allan Hancock College has official SecureW2 instructions but no public profile was obtained; it is excluded from the map. Historical SecureW2 references alone were not sufficient for inclusion.
