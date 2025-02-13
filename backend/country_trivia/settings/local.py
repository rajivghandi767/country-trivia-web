from .base import *

DEBUG = True

# SQLite

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

ALLOWED_HOSTS = ['*']
CORS_ALLOWED_ORIGINS = ['http://localhost:8000']
CORS_ALLOW_CREDENTIALS = True

# Email Settings
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'development@rajivwallace.com'
