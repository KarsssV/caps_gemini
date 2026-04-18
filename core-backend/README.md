## Needed Environment Variables
| Variables    | Use                               |
|--------------|-----------------------------------|
| DATABASE_URL | Direct connection to the database |
| JWT_SECRET   | JWT secret key                    |
| BE_CORE_URL  | URL of Backend Core               |
| BE_AI_URL    | URL of Backend AI                 |
| FE_URL       | URL of Frontend                   |

## How to run
### Run
`make run` or `go run main.go`

### Development
`make generate` or `sqlc generate` to generate the db files
**_Change `uuid.uuid` to `uuid.UUID`_**

### Migrations
`make migration name=<version name>`
Create a new migration version

`make migrate-up`
Increases the migration version and applies it to the connected database in the `.env` file (`DATABASE_URL`)

`make migrate-down`
Reduces the migration version and applies it to the connected database in the `.env` file (`DATABASE_URL`)

`make migrate-status`
Checks the migration version of the connected database in the `.env` file (`DATABASE_URL`)