---
applyTo: '**'
---
# UI General Instructions
- The UI is a frontend react application for the Pulp project.
- The UI is built using React and TypeScript.
- The UI should live in the ./src directory.
- The UI should communicate with the backend API at localhost:8080/pulp/api/v3/
- The tests/run_container.sh <command> script should be used to run all tests in a containerized environment
- Documentation for pulp can be found at https://pulpproject.org/user/

# UI Test Instructions
- Tests should be run with: `cd /home/gino/git/glisignoli/ai-pulp-ui && ./tests/run_container.sh npm test -- --run`

# UI Layout Instructions
- There should be a left navigation drawer that contains links to all major sections of the application.
- The left navigation drawer should be collapsible.

# UI Login Instructions
- The UI should support user authentication with a login page.
- The login page should validate the user's credentials against the backend API url at localhost:8080/pulp/api/v3/groups/
- Upon successful login, the user should be redirected to the main dashboard page.
- If the login fails, an error message should be displayed to the user.

# PULP REST API Documentation
- Always use RPM Documentation here: https://pulpproject.org/pulp_rpm/restapi/
- Always use File Documentation here: https://pulpproject.org/pulp_file/restapi/
- Always use DEB Documentation here: https://pulpproject.org/pulp_deb/restapi/

# PULP Repository fixtures
- Repository fixtures for testing can be found at: https://fixtures.pulpproject.org/

# UI navigation drawer Instructions
- The navigation drawer should contain the following sections:
  - Home
  - RPM
    - Distribution
    - Publication
    - Remote
    - Repository
  - File
    - Distribution
    - Publication
    - Remote
    - Repository
  - Debian
    - Distribution
    - Publication
    - Remote
    - Repository
