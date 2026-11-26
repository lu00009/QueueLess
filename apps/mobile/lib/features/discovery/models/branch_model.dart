class OperatingHourModel {
  final int dayOfWeek;
  final String openTime;
  final String closeTime;
  final bool isClosed;

  OperatingHourModel({
    required this.dayOfWeek,
    required this.openTime,
    required this.closeTime,
    required this.isClosed,
  });

  factory OperatingHourModel.fromJson(Map<String, dynamic> json) {
    return OperatingHourModel(
      dayOfWeek: json['dayOfWeek'] ?? 0,
      openTime: json['openTime'] ?? '08:00',
      closeTime: json['closeTime'] ?? '18:00',
      isClosed: json['isClosed'] ?? false,
    );
  }
}

class BranchServiceModel {
  final String id;
  final String name;
  final String code;
  final int estimatedDurationMinutes;

  BranchServiceModel({
    required this.id,
    required this.name,
    required this.code,
    required this.estimatedDurationMinutes,
  });

  factory BranchServiceModel.fromJson(Map<String, dynamic> json) {
    return BranchServiceModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      code: json['code'] ?? '',
      estimatedDurationMinutes: json['estimatedDurationMinutes'] ?? 15,
    );
  }
}

class BranchModel {
  final String id;
  final String organizationId;
  final String name;
  final String code;
  final String? address;
  final String? phone;
  final double? latitude;
  final double? longitude;
  final String organizationName;
  final List<OperatingHourModel> operatingHours;
  final List<BranchServiceModel> services;

  BranchModel({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.code,
    this.address,
    this.phone,
    this.latitude,
    this.longitude,
    required this.organizationName,
    required this.operatingHours,
    required this.services,
  });

  factory BranchModel.fromJson(Map<String, dynamic> json) {
    final org = json['organization'] as Map<String, dynamic>?;
    final hours = (json['operatingHours'] as List<dynamic>?)
            ?.map((h) => OperatingHourModel.fromJson(h as Map<String, dynamic>))
            .toList() ??
        [];
    final serv = (json['services'] as List<dynamic>?)
            ?.map((s) => BranchServiceModel.fromJson(s as Map<String, dynamic>))
            .toList() ??
        [];

    return BranchModel(
      id: json['id'] ?? '',
      organizationId: json['organizationId'] ?? '',
      name: json['name'] ?? '',
      code: json['code'] ?? '',
      address: json['address'],
      phone: json['phone'],
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      organizationName: org?['name'] ?? '',
      operatingHours: hours,
      services: serv,
    );
  }
}
