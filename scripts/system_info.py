import platform
import socket
import os
import sys
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# --- CONFIGURATION ---
USER_EMAIL = "hilariobsferreira0@gmail.com"
# YOU MUST PUT YOUR APP PASSWORD HERE FOR IT TO WORK
# Generate it here: https://myaccount.google.com/apppasswords
USER_PASSWORD = "REPLACE_ME_WITH_YOUR_GOOGLE_APP_PASSWORD" 
# ---------------------

def send_email(subject, body):
    sender_email = USER_EMAIL
    receiver_email = USER_EMAIL
    smtp_server = "smtp.gmail.com"
    smtp_port = 465

    if USER_PASSWORD == "REPLACE_ME_WITH_YOUR_GOOGLE_APP_PASSWORD":
        print("\n" + "!"*50)
        print("CRITICAL ERROR: PASSWORD MISSING")
        print("!"*50)
        print("Gmail requires an App Password to send email.")
        print("1. Go to https://myaccount.google.com/apppasswords")
        print("2. Generate a new App Password.")
        print("3. Edit this script and replace 'REPLACE_ME_WITH_YOUR_GOOGLE_APP_PASSWORD' with the code.")
        print("!"*50 + "\n")
        return

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = receiver_email
    message["Subject"] = subject

    message.attach(MIMEText(body, "plain"))

    context = ssl.create_default_context()

    try:
        print(f"Attempting to send email to {receiver_email}...")
        with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
            server.login(sender_email, USER_PASSWORD)
            server.sendmail(sender_email, receiver_email, message.as_string())
        print("Email sent successfully!")
    except Exception as e:
        print(f"Error sending email: {e}")

def get_system_info():
    # Create a filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"system_info_{timestamp}.txt"
    
    output = []
    output.append("Gathering System Information...")
    output.append("-" * 40)

    # OS Information
    output.append(f"OS System: {platform.system()}")
    output.append(f"OS Release: {platform.release()}")
    output.append(f"OS Version: {platform.version()}")
    output.append(f"Machine: {platform.machine()}")
    output.append(f"Processor: {platform.processor()}")
    
    # Network Information
    hostname = socket.gethostname()
    output.append(f"Hostname: {hostname}")
    try:
        # This method gets the local IP address
        ip_address = socket.gethostbyname(hostname)
        output.append(f"Local IP Address: {ip_address}")
    except socket.error:
        output.append("Local IP Address: Could not determine")

    # Python Version
    output.append(f"Python Version: {sys.version.split()[0]}")

    # CPU Cores
    try:
        # os.cpu_count() returns the number of logical CPUs
        output.append(f"CPU Cores (Logical): {os.cpu_count()}")
    except Exception:
        pass

    output.append("-" * 40)
    output.append("Information collection complete.")

    report_content = "\n".join(output)

    # Write to file
    try:
        with open(filename, "w") as f:
            f.write(report_content)
        print(f"Report successfully saved to {filename}")
    except IOError as e:
        print(f"Error saving report: {e}")

    # Send Email
    send_email(f"System Information Report - {hostname}", report_content)

if __name__ == "__main__":
    get_system_info()
