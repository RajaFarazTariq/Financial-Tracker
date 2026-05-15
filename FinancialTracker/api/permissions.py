from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Object-level: only the owning user can read/write the resource.

    Works for models with a `user` FK and for models reachable via `account.user`.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        owner = getattr(obj, "user", None)
        if owner is None and hasattr(obj, "account"):
            owner = obj.account.user
        return owner == request.user
