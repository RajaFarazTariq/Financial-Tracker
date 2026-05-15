"""Celery application for background bank-sync work.

Run a worker (Windows-friendly pool):
    celery -A FinancialTracker worker --pool=solo -l info

For local dev without Redis/a worker, set CELERY_TASK_ALWAYS_EAGER=true
and tasks run inline in the calling process.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "FinancialTracker.settings")

app = Celery("FinancialTracker")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
