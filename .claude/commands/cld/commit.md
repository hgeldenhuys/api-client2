# Commit [$OPTIONAL_PROMPT]

## Steps

- [ ] Check any changed files for compilation or linting issues or missing dependencies etc.
- [ ] Look at all the git changes in the repo and decide if you need to update any relevant documentation.
- [ ] Add a summary and any new assumption in `@docs/CHANGELOG.md` with the format:
  ```
  - [<agent_name>] <short summary of changes>
  ```
- [ ] If you made any changes to the agent's functionality, update the `README.md` with relevant details.
- [ ] If you added new commands, update the `@docs/commands/README.md` with their descriptions.
- [ ] Decide if there are any new test cases needed for the changes made.
- [ ] Run the tests to ensure everything is working as expected.
- [ ] Commit message that summarizes the changes made. DON'T MENTION yourself in the commit message.

At any point if you need to ask for help, prompt the user before proceeding with the commit.

If the user passed $OPTIONAL_PROMPT consider the additional instructions.