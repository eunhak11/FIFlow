// fiflow_app/lib/pages/manage_stocks_page.dart
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';

class ManageStocksPage extends StatefulWidget {
  const ManageStocksPage({Key? key, required this.onBack}) : super(key: key);

  final VoidCallback onBack;

  @override
  State<ManageStocksPage> createState() => _ManageStocksPageState();
}

class _ManageStocksPageState extends State<ManageStocksPage> {
  final TextEditingController _stockCodeController = TextEditingController();
  List<Map<String, dynamic>> _stocks = []; // 주식 정보를 Map 형태로 저장
  
  // API 서버 URL 설정
  String get _apiBaseUrl {
    return dotenv.env['API_BASE_URL'] ?? '';
  }

  @override
  void initState() {
    super.initState();
    _fetchStocks(); // 페이지 로드 시 주식 목록 가져오기
  }

  Future<void> _fetchStocks() async {
    final String apiUrl = '$_apiBaseUrl/stocks';
    try {
      final headers = await AuthService.getAuthHeaders(context);
      print('Fetching stocks with headers: $headers'); // 수정: 문자열 연결
      print('Fetching stocks URL: $apiUrl'); // 수정
      final response = await http.get(
        Uri.parse(apiUrl),
        headers: headers,
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          print('Fetch stocks timeout');
          throw Exception('요청 시간 초과');
        },
      );
      print('Fetch stocks response status: ${response.statusCode}'); // 수정
      print('Fetch stocks response body: ${response.body}'); // 수정
      if (response.statusCode == 200) {
        final List<dynamic> responseData = jsonDecode(response.body);
        setState(() {
          _stocks = responseData.cast<Map<String, dynamic>>();
          print('Stocks loaded: $_stocks'); // 수정
        });
      } else {
        print('Fetch stocks error response: ${response.body}'); // 수정
        _showSnackBar('주식 목록을 가져오는 데 실패했습니다: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Fetch stocks error: $e'); // 수정
      _showSnackBar('네트워크 오류: $e');
    }
  }

  Future<void> _addStock() async {
    final String stockCode = _stockCodeController.text.trim();
    if (stockCode.isEmpty) {
      _showSnackBar('종목 코드를 입력해주세요.');
      return;
    }

    final String apiUrl = '$_apiBaseUrl/stock/add';
    print('=== Add 버튼 클릭됨 ===');
    print('종목 코드: $stockCode');
    print('API URL: $apiUrl');

    try {
      print('HTTP 요청 시작...');
      print('요청 URL: $apiUrl');

      final headers = await AuthService.getAuthHeaders(context);
      headers['Content-Type'] = 'application/json';
      print('요청 헤더: $headers');

      final body = jsonEncode({'symbol': stockCode});
      print('요청 본문: $body');

      final response = await http.post(
        Uri.parse(apiUrl),
        headers: headers,
        body: body,
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          print('HTTP 요청 타임아웃');
          throw Exception('요청 시간 초과');
        },
      );
      print('HTTP 응답 상태 코드: ${response.statusCode}');
      print('HTTP 응답 본문: ${response.body}');
      print('Add stock API response: statusCode=${response.statusCode}, body=${response.body}');

      if (response.statusCode == 201 || response.statusCode == 200) {
        final Map<String, dynamic> responseData = jsonDecode(response.body);
        _showSnackBar(responseData['message'] ?? '주식 추가 성공!');
        _stockCodeController.clear();
        _fetchStocks();
      } else {
        final Map<String, dynamic> errorData = jsonDecode(response.body);
        _showSnackBar(errorData['message'] ?? '주식 추가 실패!');
      }
    } catch (e) {
      print('Add stock error: $e');
      _showSnackBar('네트워크 오류: $e');
    }
  }

  Future<void> _deleteStock(String symbol) async {
    final String apiUrl = '$_apiBaseUrl/stock/$symbol';
    print('=== Delete 버튼 클릭됨 ===');
    print('삭제할 종목 코드: $symbol');
    print('API URL: $apiUrl');

    try {
      print('HTTP DELETE 요청 시작...');
      final response = await http.delete(
        Uri.parse(apiUrl),
        headers: await AuthService.getAuthHeaders(context), // 수정: 인증 헤더 사용
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          print('HTTP 요청 타임아웃');
          throw Exception('요청 시간 초과');
        },
      );
      print('HTTP 응답 상태 코드: ${response.statusCode}');
      print('HTTP 응답 본문: ${response.body}');

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = jsonDecode(response.body);
        _showSnackBar(responseData['message'] ?? '주식 삭제 성공!');
        _fetchStocks();
      } else {
        final Map<String, dynamic> errorData = jsonDecode(response.body);
        _showSnackBar(errorData['message'] ?? '주식 삭제 실패!');
      }
    } catch (e) {
      print('Delete stock error: $e');
      _showSnackBar('네트워크 오류: $e');
    }
  }

  Future<void> _showDeleteConfirmation(String symbol, String stockName) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text(
            '주식 삭제',
            style: TextStyle(
              fontFamily: 'Montserrat-SemiBold',
              fontSize: 20,
            ),
          ),
          content: Text(
            '$stockName ($symbol)을(를) 정말 삭제하시겠습니까?',
            style: const TextStyle(
              fontFamily: 'Montserrat-Regular',
              fontSize: 16,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text(
                '취소',
                style: TextStyle(
                  fontFamily: 'Montserrat-Regular',
                  fontSize: 16,
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text(
                '삭제',
                style: TextStyle(
                  fontFamily: 'Montserrat-SemiBold',
                  fontSize: 16,
                  color: Colors.red,
                ),
              ),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await _deleteStock(symbol);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'My Stocks',
                    style: TextStyle(
                      fontFamily: 'Montserrat-SemiBold',
                      fontSize: 36,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.home, size: 32),
                    onPressed: widget.onBack,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _stockCodeController,
                      decoration: const InputDecoration(
                        hintText: 'Add with code',
                        hintStyle: TextStyle(
                          fontFamily: 'Montserrat-Regular',
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                        border: OutlineInputBorder(),
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      style: const TextStyle(
                        fontFamily: 'Montserrat-Regular',
                        fontSize: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _addStock,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(80, 48),
                      backgroundColor: const Color(0xFFE8F5E8),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    child: const Text(
                      'Add',
                      style: TextStyle(
                        fontFamily: 'Montserrat-SemiBold',
                        fontSize: 18,
                        color: Colors.black,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              const Text(
                'Current',
                style: TextStyle(
                  fontFamily: 'Montserrat-SemiBold',
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                height: MediaQuery.of(context).size.height * 0.6,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _stocks.length,
                  itemBuilder: (context, index) {
                    final stock = _stocks[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${stock['name']} (${stock['symbol']})',
                              style: const TextStyle(
                                fontFamily: 'Montserrat-Regular',
                                fontSize: 18,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 28),
                            onPressed: () {
                              _showDeleteConfirmation(stock['symbol'], stock['name']);
                            },
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}