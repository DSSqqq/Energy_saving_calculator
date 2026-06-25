from rest_framework import serializers
from .models import Task, GeoObject, Building

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'assignee', 'status']

class GeoObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeoObject
        fields = ['id', 'name', 'contract_number', 'created_at']
        read_only_fields = ['id', 'created_at']

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = ['id', 'object', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']
