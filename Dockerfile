# Use the official Python base image
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy dependency file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Command to run your app
CMD ["python", "app.py"]
