# n8n-nodes-harmony

This is an n8n community node for [Harmony](https://harmony.io), the AI-native IT service desk.
Use it to create and update tickets, reply to employees, manage assets and applications, and
read the requests the Harmony AI agent handled, all from your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/)
workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Usage](#usage)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
in the n8n community nodes documentation, and install the `n8n-nodes-harmony` package.

## Credentials

The node authenticates with a Harmony **access key**.

1. In Harmony, go to **Settings > Access Keys** and create a key.
   ([Managing API access keys](https://docs.harmony.io/settings/managing-api-access-keys))
2. Pick the key's role:
   - **Read**: get and list operations only.
   - **Read + Write**: also create, update, add and remove operations.
3. In n8n, create a **Harmony API** credential and paste the key into **Access Key**.

The key decides which Harmony organization the node works in. Requests run as the user who
created the key, so changes (for example, assigning an application owner) are attributed to
that user in Harmony's activity history. Create the key from an account that should appear as
the author.

## Operations

| Resource                    | Operations                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**                  | Create, Get, Get Many, Search (adds ticket metadata filters), Update, Update Many, Get Activity, Get Custom Fields, Set Custom Fields |
| **Ticket Message**          | Create (reply or internal note), Get Many                                                                                             |
| **Ticket Watcher**          | Add (employee or any email address), Remove                                                                                           |
| **Ticket Link**             | Add, Get Many, Remove                                                                                                                 |
| **Desk**                    | Get, Get Many, Get Subdesks, Get Tags, Get Custom Field Definitions                                                                   |
| **Employee**                | Get, Get Many, Batch Get (by ID or work email)                                                                                        |
| **Asset**                   | Create, Get, Get Many, Update (including assignment), Get Activity                                                                    |
| **Application**             | Get, Get Many, Update                                                                                                                 |
| **Application Stakeholder** | Add, Get Many, Remove (app owners, IT approvers, budget approvers)                                                                    |
| **Catalog Category**        | Get Many (with their items)                                                                                                           |
| **Catalog Item**            | Get (with its form fields)                                                                                                            |
| **Request**                 | Get, Get Many, Get Messages: conversations handled by the Harmony AI agent                                                            |

Every list operation supports **Return All** and **Limit**. Operations that return large
records (tickets, employees, assets, applications and requests) have a **Simplify** option,
on by default, that returns the 10 most useful fields. Turn it off to get the full record.

The node can also be used as a tool by n8n AI agents.

## Usage

**IDs.** Tickets use their display ID, for example `INC-7814` (case-insensitive). Desks use the
slug from their URL in Harmony (`/tickets/desk/<desk-id>`), such as `it-desk`. Desk and employee
parameters let you pick from a searchable list instead. Assets use their readable ID, such as
`LP-DL-6sNdq`.

**Lists in text fields.** Filters that take several values, such as **Desk IDs** or **Work
Emails**, accept a comma-separated list: `it-desk, hr`.

**Avoiding duplicates on retries.** **Ticket > Create** and **Ticket Message > Create** accept an
**Idempotency Key**. Retrying with the same key returns the original result instead of creating
a second ticket or message. Use a value that identifies the source event, for example
`{{ $json.orderId }}-ticket`.

**Custom fields** are JSON objects. Use **Desk > Get Custom Field Definitions** to find the field
IDs for a desk, then pass values keyed by those IDs, for example `{"laptop_model": "MacBook Pro"}`.

**Unassigning.** To unassign a ticket or an asset, set the assignee to `_UNASSIGN_`.

### Example: open a ticket from a form and post an internal note

1. **n8n Form Trigger** collects a title, description and the requester's work email.
2. **Harmony > Employee > Batch Get** with **Look Up By** set to _Work Email_ finds the employee.
3. **Harmony > Ticket > Create** opens the ticket in your desk, with **Reporter** set to
   `{{ $json.id }}` (ID mode).
4. **Harmony > Ticket Message > Create** adds an internal note with the form's extra details,
   with **Internal Note** turned on.

## Compatibility

Requires n8n 2.46.1 or later. Tested with n8n 2.47.7.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Harmony API reference](https://docs.harmony.io/api-reference/introduction)
- [Managing Harmony API access keys](https://docs.harmony.io/settings/managing-api-access-keys)

## Version history

### 0.1.0

First release. Covers every operation of the Harmony public API.
