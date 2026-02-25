from rest_framework import serializers
from .models import Country, ReportedIssue


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name', 'capital', 'continent']


class ReportedIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportedIssue
        fields = '__all__'
