
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from trivia.views import AIQuizViewSet, CountryViewSet, ReportedIssueViewSet

router = routers.DefaultRouter()
router.register('trivia', CountryViewSet, basename='trivia')
router.register('ai-quiz', AIQuizViewSet, basename='ai-quiz')
router.register(r'report-issue', ReportedIssueViewSet, basename='report-issue')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/', include(router.urls)),
    path('', include('django_prometheus.urls')),
]
