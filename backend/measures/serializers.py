from rest_framework import serializers
from .models import Task, GeoObject, Building, Window, Door, BuildingSection

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

class WindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Window
        fields = ['id', 'building', 'height', 'width', 'orientation', 'material', 'glazing', 'created_at']
        read_only_fields = ['id', 'created_at']

class DoorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Door
        fields = ['id', 'building', 'height', 'width', 'orientation', 'material', 'created_at']
        read_only_fields = ['id', 'created_at']

class BuildingSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildingSection
        fields = [
            'id', 'building', 'name', 'floors', 'height_outer', 'height_inner',
            'wall_material', 'roof_type', 'roof_material', 'length', 'width',
            'offset_x', 'offset_y', 'sides', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
