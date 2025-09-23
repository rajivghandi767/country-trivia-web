
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers, serializers, viewsets

router = routers.DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/', include(router.urls))
]
