# Insurance P1-02 Orphan Cleanup

Verified orphan policies from pre-fix folder-path misclassification.

| Orphan policy ID                       | Source document                           | Reason                                                                          | Replacement canonical policy                  |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| `80e75d98-76f5-4603-a0dc-e89689ac7ba9` | Amethyst - SBI General Home insurance.pdf | Home folder doc received health-typed duplicate before folder-path priority fix | `3c04a38d-6ad5-4dab-a2b8-42a388bbb7a0` (home) |
| `9fc4c5e3-f312-48fe-b493-e94c59edc3a1` | Liviano - SBI General Home insurance.pdf  | Home folder doc received health-typed duplicate before folder-path priority fix | `e223e41b-09b0-4c59-b13b-fbd88e5f23cf` (home) |

## Safety verification (pre-delete)

| Check                                                    | Orphan 1                 | Orphan 2                 |
| -------------------------------------------------------- | ------------------------ | ------------------------ |
| Referenced by `insurance_documents.parsed_data.policyId` | No                       | No                       |
| Referenced by canonical home policy                      | Yes (replacement exists) | Yes (replacement exists) |
| `insurance_claims` rows                                  | 0                        | 0                        |
| `insurance_members` rows                                 | 0                        | 0                        |
| `insurance_coverage` rows                                | 0                        | 0                        |
| Safe to delete                                           | Yes                      | Yes                      |

Both orphans shared `source_document_ids` with their canonical home policy but were not the active document link (`parsed_data.policyId` pointed to home policies).
