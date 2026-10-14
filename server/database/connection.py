from decouple import config
from database.db_utils import connect_db

db_name = config("DB_NAME")
mongodb_connection_str = config("MONGODB_CONNECTION_STR")

# One shared database connection, reused by every collection (Users, Analysis, ...).
db = connect_db(mongodb_connection_str, db_name)
