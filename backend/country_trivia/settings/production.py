from .base import *

DEBUG = False

# PostgreSQL

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'country-trivia',
        'USER': os.environ.get('POSTGRESQL_USER'),
        'PASSWORD': os.environ.get('POSTGRESQL_PASSWORD'),
        'PORT': '5432',
        'HOST': 'db.rajivwallace.com'
    }
}

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

# CORS/CSRF Settings
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOW_CREDENTIALS = True
CSRF_COOKIE_SECURE = True  # Use a secure cookie for CSRF
CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS', '').split(',')  # Trust your domain
CSRF_USE_SESSIONS = True  # Store CSRF tokens in sessions instead of cookies

# Session Settings
SESSION_ENGINE = "django.contrib.sessions.backends.db"
# Cookie Security
SESSION_COOKIE_SECURE = True  # Use a secure cookie for sessions
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to the session cookie

# # Referrer Policy
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# HTTPS Settings
SECURE_SSL_REDIRECT = True  # Redirect all HTTP to HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO',
                           'https')  # For reverse proxies

# Enable HTTP Strict Transport Security (1 year)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True  # Include subdomains in HSTS
SECURE_HSTS_PRELOAD = True  # Preload the HSTS policy
SECURE_BROWSER_XSS_FILTER = True  # Enable XSS filtering
SECURE_CONTENT_TYPE_NOSNIFF = True  # Prevent browsers from MIME-type sniffing

# X-Frame Options
X_FRAME_OPTIONS = "DENY"  # Prevent the site from being embedded in an iframe

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "file": {
            "level": "ERROR",
            "class": "logging.FileHandler",
            "filename": "errors.log",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["file"],
            "level": "ERROR",
            "propagate": True,
        },
    },
}

# Email Settings

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
