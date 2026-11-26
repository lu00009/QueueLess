import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/branch_model.dart';

final branchDiscoveryProvider = FutureProvider.family<List<BranchModel>, String?>((ref, searchQuery) async {
  final response = await ApiClient.dio.get('/branches', queryParameters: {
    if (searchQuery != null && searchQuery.isNotEmpty) 'search': searchQuery,
  });

  final list = response.data['data'] as List<dynamic>;
  return list.map((item) => BranchModel.fromJson(item as Map<String, dynamic>)).toList();
});
