.PHONY: help start stop restart logs psql extract load clean reset

help:
	@echo "Enron Email Graph - Available Commands:"
	@echo ""
	@echo "  Database:"
	@echo "    make start       - Start PostgreSQL container"
	@echo "    make stop        - Stop PostgreSQL container"
	@echo "    make restart     - Restart PostgreSQL container"
	@echo "    make logs        - View PostgreSQL logs"
	@echo "    make psql        - Connect to database with psql"
	@echo "    make pgadmin     - Start with pgAdmin GUI"
	@echo ""
	@echo "  Data Pipeline:"
	@echo "    make extract     - Extract emails from tarball (limit 1000)"
	@echo "    make extract-all - Extract all emails (full dataset)"
	@echo "    make load        - Load extracted data into database"
	@echo "    make pipeline    - Run full pipeline (extract-all + load)"
	@echo ""
	@echo "  Utilities:"
	@echo "    make clean       - Remove extracted data"
	@echo "    make reset       - Reset everything (stop, clean, restart)"
	@echo "    make install     - Install Python dependencies"
	@echo ""

start:
	@echo "Starting PostgreSQL container..."
	@cp -n .env.example .env 2>/dev/null || true
	docker-compose up -d postgres
	@echo "Waiting for database to be ready..."
	@sleep 3
	@docker-compose exec postgres pg_isready -U enron -d enron_emails || (sleep 2 && docker-compose exec postgres pg_isready -U enron -d enron_emails)
	@echo "✓ Database ready!"

pgadmin:
	@echo "Starting PostgreSQL and pgAdmin..."
	@cp -n .env.example .env 2>/dev/null || true
	docker-compose --profile gui up -d
	@echo "✓ pgAdmin available at http://localhost:5050"
	@echo "  Login: admin@enron.local / admin"
	@echo "  Add server: enron_postgres / enron / enron_dev_password"

stop:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f postgres

psql:
	docker-compose exec postgres psql -U enron -d enron_emails

install:
	pip install -r requirements.txt

extract:
	python3 extract_emails.py --limit 1000

extract-all:
	python3 extract_emails.py

load:
	python3 load_to_postgres.py

pipeline: extract-all load
	@echo "✓ Full pipeline complete!"

clean:
	rm -rf extracted_data/

reset: stop clean
	docker-compose down -v
	@echo "✓ Reset complete. Run 'make start' to begin fresh."
