from django.contrib import admin

from .models import EmailInbox, PlaidItem


@admin.register(PlaidItem)
class PlaidItemAdmin(admin.ModelAdmin):
    list_display = ("institution_name", "user", "status", "last_synced_at", "created_at")
    list_filter = ("status",)
    search_fields = ("institution_name", "user__username", "item_id")
    # Never expose the (decrypted) access token in the admin.
    exclude = ("access_token", "transactions_cursor")
    readonly_fields = ("item_id", "institution_id", "last_synced_at", "created_at")


@admin.register(EmailInbox)
class EmailInboxAdmin(admin.ModelAdmin):
    list_display = ("email_address", "user", "status", "last_scanned_at", "created_at")
    list_filter = ("status",)
    search_fields = ("email_address", "user__username")
    # Never expose the (decrypted) app password in the admin.
    exclude = ("app_password",)
    readonly_fields = ("last_seen_uid", "last_scanned_at", "created_at")
