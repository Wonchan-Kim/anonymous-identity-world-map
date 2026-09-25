# eduroam Android Profile Outer Identity Report

## Core finding

This report summarizes whether Android `eap-config` profiles explicitly contain an `OuterIdentity` or `AnonymousIdentity` field.

The main metric is the country-level percentage of profiles where the outer identity field is missing.

- `YES`: the profile explicitly contains `OuterIdentity` or `AnonymousIdentity`.
- `NO`: the profile does not contain either field.
- This is profile-level analysis only. It does not claim runtime client behavior.

## Dataset summary

| Dataset | Countries | Profiles | YES: outer identity exists | NO: outer identity missing | Missing % |
|---|---:|---:|---:|---:|---:|
| geteduroam discovery verified-university subset | 66 | 3237 | 1264 | 1973 | 60.95% |
| CAT User API university-matched subset | 68 | 1626 | 622 | 1004 | 61.75% |

## Method

### geteduroam discovery dataset

The geteduroam dataset was collected from the public geteduroam discovery flow. Institution names were filtered to a conservative confirmed-university subset using country-specific UniRank A-Z university lists. Institutions not confirmed by UniRank were checked with Wikidata as a secondary validation step. Ambiguous matches were excluded from the confirmed-university subset.

### CAT User API dataset

The CAT dataset uses Android `eap-config` profiles collected through the CAT User API. The university-matched subset was filtered using UniRank and then manually cleaned by conservatively removing clear false matches.

## Country-level percentage: geteduroam discovery

| Country | Code | Profiles | Outer identity exists | Outer identity missing | Missing % | Exists % |
| --- | --- | --- | --- | --- | --- | --- |
| United Arab Emirates | AE | 6 | 0 | 6 | 100.0 | 0.0 |
| Armenia | AM | 14 | 0 | 14 | 100.0 | 0.0 |
| Czechia | CZ | 2 | 0 | 2 | 100.0 | 0.0 |
| Ethiopia | ET | 62 | 0 | 62 | 100.0 | 0.0 |
| Georgia | GE | 22 | 0 | 22 | 100.0 | 0.0 |
| Ghana | GH | 46 | 0 | 46 | 100.0 | 0.0 |
| Israel | IL | 14 | 0 | 14 | 100.0 | 0.0 |
| Morocco | MA | 2 | 0 | 2 | 100.0 | 0.0 |
| North Macedonia | MK | 2 | 0 | 2 | 100.0 | 0.0 |
| Malawi | MW | 2 | 0 | 2 | 100.0 | 0.0 |
| Mexico | MX | 14 | 0 | 14 | 100.0 | 0.0 |
| Oman | OM | 38 | 0 | 38 | 100.0 | 0.0 |
| Peru | PE | 6 | 0 | 6 | 100.0 | 0.0 |
| Singapore | SG | 2 | 0 | 2 | 100.0 | 0.0 |
| Slovakia | SK | 2 | 0 | 2 | 100.0 | 0.0 |
| Ukraine | UA | 22 | 0 | 22 | 100.0 | 0.0 |
| Zambia | ZM | 28 | 0 | 28 | 100.0 | 0.0 |
| Ecuador | EC | 78 | 2 | 76 | 97.44 | 2.56 |
| Japan | JP | 76 | 2 | 74 | 97.37 | 2.63 |
| Portugal | PT | 66 | 4 | 62 | 93.94 | 6.06 |
| Uganda | UG | 60 | 4 | 56 | 93.33 | 6.67 |
| Australia | AU | 54 | 4 | 50 | 92.59 | 7.41 |
| Norway | NO | 24 | 2 | 22 | 91.67 | 8.33 |
| Colombia | CO | 22 | 2 | 20 | 90.91 | 9.09 |
| Kenya | KE | 36 | 4 | 32 | 88.89 | 11.11 |
| Lithuania | LT | 9 | 1 | 8 | 88.89 | 11.11 |
| Argentina | AR | 14 | 2 | 12 | 85.71 | 14.29 |
| Turkey | TR | 11 | 2 | 9 | 81.82 | 18.18 |
| Tanzania | TZ | 20 | 4 | 16 | 80.0 | 20.0 |
| United States | US | 385 | 83 | 302 | 78.44 | 21.56 |
| Austria | AT | 45 | 10 | 35 | 77.78 | 22.22 |
| Sweden | SE | 9 | 2 | 7 | 77.78 | 22.22 |
| United Kingdom | UK | 356 | 87 | 269 | 75.56 | 24.44 |
| Nigeria | NG | 8 | 2 | 6 | 75.0 | 25.0 |
| Poland | PL | 24 | 6 | 18 | 75.0 | 25.0 |
| Belgium | BE | 23 | 7 | 16 | 69.57 | 30.43 |
| Costa Rica | CR | 6 | 2 | 4 | 66.67 | 33.33 |
| South Africa | ZA | 24 | 8 | 16 | 66.67 | 33.33 |
| Brazil | BR | 233 | 78 | 155 | 66.52 | 33.48 |
| Netherlands | NL | 53 | 20 | 33 | 62.26 | 37.74 |
| Denmark | DK | 10 | 4 | 6 | 60.0 | 40.0 |
| Switzerland | CH | 28 | 12 | 16 | 57.14 | 42.86 |
| Italy | IT | 88 | 40 | 48 | 54.55 | 45.45 |
| Chile | CL | 71 | 33 | 38 | 53.52 | 46.48 |
| Nepal | NP | 12 | 6 | 6 | 50.0 | 50.0 |
| New Zealand | NZ | 12 | 6 | 6 | 50.0 | 50.0 |
| Malaysia | MY | 68 | 36 | 32 | 47.06 | 52.94 |
| Ireland | IE | 34 | 20 | 14 | 41.18 | 58.82 |
| Spain | ES | 141 | 89 | 52 | 36.88 | 63.12 |
| Bulgaria | BG | 12 | 8 | 4 | 33.33 | 66.67 |
| Philippines | PH | 24 | 16 | 8 | 33.33 | 66.67 |
| Greece | GR | 44 | 30 | 14 | 31.82 | 68.18 |
| France | FR | 233 | 164 | 69 | 29.61 | 70.39 |
| Canada | CA | 157 | 130 | 27 | 17.2 | 82.8 |
| Germany | DE | 268 | 225 | 43 | 16.04 | 83.96 |
| Finland | FI | 18 | 16 | 2 | 11.11 | 88.89 |
| Taiwan | TW | 38 | 34 | 4 | 10.53 | 89.47 |
| Bangladesh | BD | 38 | 36 | 2 | 5.26 | 94.74 |
| Botswana | BW | 2 | 2 | 0 | 0.0 | 100.0 |
| Croatia | HR | 4 | 4 | 0 | 0.0 | 100.0 |
| Hungary | HU | 2 | 2 | 0 | 0.0 | 100.0 |
| Luxembourg | LU | 2 | 2 | 0 | 0.0 | 100.0 |
| Malta | MT | 1 | 1 | 0 | 0.0 | 100.0 |
| Saudi Arabia | SA | 2 | 2 | 0 | 0.0 | 100.0 |
| Slovenia | SI | 6 | 6 | 0 | 0.0 | 100.0 |
| Uruguay | UY | 2 | 2 | 0 | 0.0 | 100.0 |

## Country-level percentage: CAT User API

| Country | Code | Profiles | Outer identity exists | Outer identity missing | Missing % | Exists % |
| --- | --- | --- | --- | --- | --- | --- |
| AE | AE | 3 | 0 | 3 | 100.0 | 0.0 |
| AM | AM | 6 | 0 | 6 | 100.0 | 0.0 |
| CZ | CZ | 5 | 0 | 5 | 100.0 | 0.0 |
| ET | ET | 32 | 0 | 32 | 100.0 | 0.0 |
| GE | GE | 11 | 0 | 11 | 100.0 | 0.0 |
| GH | GH | 23 | 0 | 23 | 100.0 | 0.0 |
| IL | IL | 8 | 0 | 8 | 100.0 | 0.0 |
| IS | IS | 1 | 0 | 1 | 100.0 | 0.0 |
| LK | LK | 1 | 0 | 1 | 100.0 | 0.0 |
| LT | LT | 4 | 0 | 4 | 100.0 | 0.0 |
| MK | MK | 1 | 0 | 1 | 100.0 | 0.0 |
| MW | MW | 1 | 0 | 1 | 100.0 | 0.0 |
| MX | MX | 7 | 0 | 7 | 100.0 | 0.0 |
| OM | OM | 17 | 0 | 17 | 100.0 | 0.0 |
| PE | PE | 3 | 0 | 3 | 100.0 | 0.0 |
| PK | PK | 1 | 0 | 1 | 100.0 | 0.0 |
| SG | SG | 1 | 0 | 1 | 100.0 | 0.0 |
| SK | SK | 1 | 0 | 1 | 100.0 | 0.0 |
| UA | UA | 16 | 0 | 16 | 100.0 | 0.0 |
| ZM | ZM | 13 | 0 | 13 | 100.0 | 0.0 |
| EC | EC | 39 | 1 | 38 | 97.44 | 2.56 |
| JP | JP | 38 | 1 | 37 | 97.37 | 2.63 |
| AU | AU | 26 | 1 | 25 | 96.15 | 3.85 |
| PT | PT | 33 | 2 | 31 | 93.94 | 6.06 |
| UG | UG | 29 | 2 | 27 | 93.1 | 6.9 |
| CO | CO | 11 | 1 | 10 | 90.91 | 9.09 |
| NO | NO | 11 | 1 | 10 | 90.91 | 9.09 |
| KE | KE | 18 | 2 | 16 | 88.89 | 11.11 |
| AR | AR | 8 | 1 | 7 | 87.5 | 12.5 |
| TZ | TZ | 10 | 2 | 8 | 80.0 | 20.0 |
| TR | TR | 50 | 11 | 39 | 78.0 | 22.0 |
| US | US | 184 | 41 | 143 | 77.72 | 22.28 |
| UK | UK | 161 | 38 | 123 | 76.4 | 23.6 |
| AT | AT | 21 | 5 | 16 | 76.19 | 23.81 |
| NG | NG | 4 | 1 | 3 | 75.0 | 25.0 |
| PL | PL | 12 | 3 | 9 | 75.0 | 25.0 |
| ZA | ZA | 11 | 3 | 8 | 72.73 | 27.27 |
| BE | BE | 9 | 3 | 6 | 66.67 | 33.33 |
| CR | CR | 3 | 1 | 2 | 66.67 | 33.33 |
| BR | BR | 113 | 39 | 74 | 65.49 | 34.51 |
| DK | DK | 7 | 3 | 4 | 57.14 | 42.86 |
| NZ | NZ | 7 | 3 | 4 | 57.14 | 42.86 |
| NL | NL | 23 | 10 | 13 | 56.52 | 43.48 |
| SE | SE | 9 | 4 | 5 | 55.56 | 44.44 |
| IT | IT | 44 | 20 | 24 | 54.55 | 45.45 |
| CL | CL | 35 | 16 | 19 | 54.29 | 45.71 |
| MY | MY | 36 | 17 | 19 | 52.78 | 47.22 |
| NP | NP | 6 | 3 | 3 | 50.0 | 50.0 |
| CH | CH | 17 | 9 | 8 | 47.06 | 52.94 |
| IE | IE | 15 | 9 | 6 | 40.0 | 60.0 |
| ES | ES | 70 | 43 | 27 | 38.57 | 61.43 |
| BG | BG | 6 | 4 | 2 | 33.33 | 66.67 |
| PH | PH | 12 | 8 | 4 | 33.33 | 66.67 |
| GR | GR | 22 | 15 | 7 | 31.82 | 68.18 |
| FR | FR | 116 | 81 | 35 | 30.17 | 69.83 |
| TW | TW | 8 | 6 | 2 | 25.0 | 75.0 |
| CA | CA | 77 | 64 | 13 | 16.88 | 83.12 |
| DE | DE | 134 | 113 | 21 | 15.67 | 84.33 |
| BD | BD | 18 | 17 | 1 | 5.56 | 94.44 |
| BW | BW | 1 | 1 | 0 | 0.0 | 100.0 |
| FI | FI | 7 | 7 | 0 | 0.0 | 100.0 |
| HR | HR | 2 | 2 | 0 | 0.0 | 100.0 |
| HU | HU | 1 | 1 | 0 | 0.0 | 100.0 |
| LU | LU | 1 | 1 | 0 | 0.0 | 100.0 |
| MT | MT | 1 | 1 | 0 | 0.0 | 100.0 |
| SA | SA | 1 | 1 | 0 | 0.0 | 100.0 |
| SI | SI | 3 | 3 | 0 | 0.0 | 100.0 |
| UY | UY | 1 | 1 | 0 | 0.0 | 100.0 |

## Country-level school lists

Detailed country-level YES/NO school lists are provided separately:

- [`geteduroam_country_school_lists.md`](geteduroam_country_school_lists.md)
- [`cat_country_school_lists.md`](cat_country_school_lists.md)

## Interpretation

The map and tables should be interpreted as a configuration-level measurement. A missing outer identity field means the downloaded Android profile does not explicitly configure an anonymous outer identity value. This does not automatically prove that the client leaks the real username at runtime, because runtime behavior may depend on the supplicant, OS version, and user-entered identity.

However, profiles that explicitly include an outer identity field provide a clearer privacy-preserving configuration signal, while profiles without the field leave the behavior more dependent on client defaults or user configuration.
