# Generating new templates
- Update the .csv file from an excel file and make sure to keep the current headings:
    - "Task Type,Task Name,Parent Name,Priority,Assigned To,Package,Pipeline Phase,Task Category,Time Anchor"
- From the server level, run "npm run generate-template". If there is not an existing template, it will create the first one; otherwise, it will increment the template number and create it from the .csv
- run "node template/seed-template" to actually have the template implemented in the database.