# backend/database.py
import pymysql
import os
import sys
from dotenv import load_dotenv

load_dotenv()

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", 3306))
DB_USER     = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME     = os.getenv("DB_NAME", "parkease")

DB_CONFIG = {
    "host":        DB_HOST,
    "port":        DB_PORT,
    "user":        DB_USER,
    "password":    DB_PASSWORD,
    "database":    DB_NAME,
    "charset":     "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit":  True,
    "connect_timeout": 5,
}


def get_connection():
    try:
        return pymysql.connect(**DB_CONFIG)
    except pymysql.err.OperationalError as e:
        code = e.args[0]
        if code == 1049:
            print("\n" + "="*60)
            print("❌  DATABASE 'parkease' NOT FOUND")
            print("="*60)
            print("   Run backend/schema.sql in MySQL Workbench first.")
            print("   File → Open SQL Script → schema.sql → Execute ⚡")
            print("="*60 + "\n")
        elif code in (1045, 2003):
            print("\n" + "="*60)
            print("❌  CANNOT CONNECT TO MYSQL")
            print("="*60)
            print(f"   Error: {e.args[1]}")
            print("   Fix: Open backend/.env and set the correct DB_PASSWORD")
            print(f"   Current password used: '{DB_PASSWORD}'")
            print("="*60 + "\n")
        raise


def query(sql, params=None, fetchone=False):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone() if fetchone else cur.fetchall()
    finally:
        conn.close()


def execute(sql, params=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            conn.commit()
            return cur.lastrowid
    finally:
        conn.close()


def test_connection():
    """Called at startup — prints result and returns True/False."""
    try:
        conn = get_connection()
        conn.close()
        print(f"  ✅  MySQL connected — database '{DB_NAME}' found")
        return True
    except Exception as e:
        print(f"  💥  DB connection failed: {e}")
        return False
