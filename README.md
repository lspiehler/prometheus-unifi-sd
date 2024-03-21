## Example Usage
To insert, send HTTP PUT request to /insert, Example:
```
{
	"mysql": {
		"host": "mysql_host",
		"user": "mysql_username",
		"password": "mysql_passord",
		"database": "mysql_database"
	},
	"query": "INSERT INTO `gpos` (`root`, `ou`, `gpo_name`) VALUES ?",
	"values": [
		["ROOT1", "OUNAME1", "GPONAME1"],
		["ROOT2", "OUNAME2", "GPONAME2"]
	]
}
```