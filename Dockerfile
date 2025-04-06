# Use official slim Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy files
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Start the app
CMD ["python", "app.py"]
