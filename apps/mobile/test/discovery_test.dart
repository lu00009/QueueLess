import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/discovery/models/branch_model.dart';

void main() {
  test('BranchModel correctly deserializes backend discovery JSON', () {
    final sampleJson = {
      'id': 'b-101',
      'organizationId': 'org-1',
      'name': 'Metro Health Main Campus',
      'code': 'MAIN',
      'address': '100 Medical Center Way',
      'organization': {'name': 'Metro Health Clinic'},
      'operatingHours': [
        {'dayOfWeek': 1, 'openTime': '08:00', 'closeTime': '18:00', 'isClosed': false}
      ],
      'services': [
        {'id': 's-1', 'name': 'General Consultation', 'code': 'GEN', 'estimatedDurationMinutes': 15}
      ]
    };

    final branch = BranchModel.fromJson(sampleJson);
    expect(branch.name, 'Metro Health Main Campus');
    expect(branch.organizationName, 'Metro Health Clinic');
    expect(branch.operatingHours.length, 1);
    expect(branch.operatingHours[0].openTime, '08:00');
    expect(branch.services.length, 1);
    expect(branch.services[0].code, 'GEN');
  });

  test('Flutter ApiClient discovers live seeded branches from backend', () async {
    ApiClient.setBaseUrl('http://127.0.0.1:5000/api/v1');
    final response = await ApiClient.dio.get('/branches');
    expect(response.statusCode, 200);

    final list = response.data['data'] as List<dynamic>;
    expect(list.isNotEmpty, true);

    final branches = list.map((json) => BranchModel.fromJson(json as Map<String, dynamic>)).toList();
    final metroBranch = branches.firstWhere((b) => b.code == 'MAIN');
    expect(metroBranch.name, 'Metro Health Main Campus');
    expect(metroBranch.services.length, greaterThan(0));
    print('Discovered live branch: ${metroBranch.name} with ${metroBranch.services.length} services');
  });
}
