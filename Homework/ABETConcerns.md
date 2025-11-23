## ABET Concerns and Project Constraints

This project—a full-stack wedding-planning client portal—has several constraints:

- **Data Security:** The system will hold client and vendor information. Use HTTPS for all traffic and store password hashes (e.g., `bcrypt.js`) instead of raw passwords. Design assuming partial failure modes to reduce exposure.

- **Maintainability:** The project will be handed off with no guarantee of future support, so it must be easy to maintain. Provide clear documentation and a straightforward structure.

- **Cost Constraints:** Hosting and third-party integrations cost money. Choose services and architectures that balance reliability and affordability.