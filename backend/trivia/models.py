from django.db import models


class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    capital = models.CharField(max_length=100)
    continent = models.CharField(max_length=50, default='Unknown')

    class Meta:
        verbose_name_plural = "Countries"
        ordering = ['name']

    def __str__(self):
        return self.name


class QuizTopic(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class QuizQuestion(models.Model):
    topic = models.ForeignKey(
        QuizTopic, on_delete=models.CASCADE, related_name='questions')
    question_text = models.CharField(max_length=500)
    options = models.JSONField()  # Stores the ["A", "B", "C", "D"] list
    correct_answer = models.CharField(max_length=200)
    fun_fact = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question_text


class CountryFunFact(models.Model):
    # related_name='fun_facts' allows reverse lookups from the Country model
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name='fun_facts')
    fact = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Fact for {self.country.name}: {self.fact[:20]}..."


class ReportedIssue(models.Model):
    ISSUE_TYPES = [
        ('fact_error', 'Fact is wrong'),
        ('typo', 'Typo or Grammar'),
        ('ui_bug', 'UI/Visual Bug'),
        ('other', 'Other'),
    ]

    # Optional context fields so you know exactly where the user was
    question_id = models.IntegerField(null=True, blank=True)
    country_name = models.CharField(max_length=100, null=True, blank=True)

    issue_type = models.CharField(max_length=20, choices=ISSUE_TYPES)
    user_note = models.TextField()
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_issue_type_display()} - {self.created_at.strftime('%m/%d/%Y')}"
