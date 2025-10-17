from rest_framework import viewsets
from .models import Country
from .serializers import CountrySerializer
import random


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A simple ViewSet for viewing countries.
    """
    queryset = Country.objects.all()
    serializer_class = CountrySerializer

    def get_queryset(self):
        """
        Optionally shuffles the queryset if the 'shuffle' query param is set.
        """
        queryset = super().get_queryset()
        if self.request.query_params.get('shuffle'):
            # Convert queryset to a list to shuffle
            country_list = list(queryset)
            random.shuffle(country_list)
            return country_list
        return queryset
