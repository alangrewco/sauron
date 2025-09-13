import psycopg

# Connect to the database
conn = psycopg.connect(
    dbname="testdb",
    user="chongly",
    password="Kraken7.1",
    host="localhost",
    port=5432
)

# Create a cursor
cur = conn.cursor()

# Create a table
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    age INT
);
""")

# Insert a row
cur.execute("INSERT INTO users (name, age) VALUES (%s, %s)", ("Alice", 30))

# Query the table
cur.execute("SELECT * FROM users;")
rows = cur.fetchall()
for row in rows:
    print(row)

# Commit and close
conn.commit()
cur.close()
conn.close()
