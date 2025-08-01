import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';

class MainPage extends StatefulWidget {
  const MainPage({Key? key, required this.onManageStocks}) : super(key: key);

  final VoidCallback onManageStocks;

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  List<Map<String, dynamic>> _stocksWithMarketData = [];
  List<Map<String, dynamic>> _indices = [];
  bool _isLoading = true;
  bool _isStockCrawlerRunning = false;
  bool _isIndexCrawlerRunning = false;
  Set<String> _favoriteStocks = {}; // 즐겨찾기된 주식들의 symbol을 저장

  // API 서버 URL 설정
  String get _apiBaseUrl {
    return 'http://localhost:3000'; // 로컬 개발용
  }

  @override
  void initState() {
    super.initState();
    _fetchStocksWithMarketData();
    _fetchIndices();
    _startCrawlerStatusPolling();
  }

  void _startCrawlerStatusPolling() {
    // 크롤러 상태를 주기적으로 확인
    Future.delayed(const Duration(seconds: 1), () {
      _checkCrawlerStatus();
    });
  }

  Future<void> _checkCrawlerStatus() async {
    try {
      final response = await http.get(Uri.parse('$_apiBaseUrl/crawler/status'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _isStockCrawlerRunning = data['stockCrawler'] ?? false;
          _isIndexCrawlerRunning = data['indexCrawler'] ?? false;
        });
        
        // 크롤러가 실행 중이면 데이터를 다시 가져옴
        if (_isStockCrawlerRunning || _isIndexCrawlerRunning) {
          _fetchStocksWithMarketData();
          _fetchIndices();
        }
      }
    } catch (e) {
      print('크롤러 상태 확인 오류: $e');
    }
    
    // 2초마다 상태 확인
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        _checkCrawlerStatus();
      }
    });
  }

  Future<void> _fetchStocksWithMarketData() async {
    try {
      final response = await http.get(Uri.parse('$_apiBaseUrl/stocks/marketdata'));
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          _stocksWithMarketData = data.cast<Map<String, dynamic>>();
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchIndices() async {
    try {
      final response = await http.get(Uri.parse('$_apiBaseUrl/indices'));
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          _indices = data.cast<Map<String, dynamic>>();
        });
      }
    } catch (e) {
      print('지수 데이터 가져오기 오류: $e');
    }
  }

  String _getCurrentDate() {
    final now = DateTime.now();
    return '${now.year}.${now.month.toString().padLeft(2, '0')}.${now.day.toString().padLeft(2, '0')}';
  }

  void _toggleFavorite(String symbol) {
    setState(() {
      if (_favoriteStocks.contains(symbol)) {
        _favoriteStocks.remove(symbol);
      } else {
        _favoriteStocks.add(symbol);
      }
    });
    print('즐겨찾기 토글: $symbol (현재 즐겨찾기: ${_favoriteStocks.length}개)');
  }

  List<Map<String, dynamic>> _getFavoriteStocks() {
    return _stocksWithMarketData.where((stock) => 
      _favoriteStocks.contains(stock['symbol'])
    ).toList();
  }

  List<Map<String, dynamic>> _getNonFavoriteStocks() {
    return _stocksWithMarketData.where((stock) => 
      !_favoriteStocks.contains(stock['symbol'])
    ).toList();
  }

  Widget _buildIndicesSection(List<Map<String, dynamic>> indices) {
    // 지수 크롤러가 실행 중인 경우
    if (_isIndexCrawlerRunning) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.green[200]!),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              '지수 데이터 업데이트 중...',
              style: TextStyle(
                fontFamily: 'Montserrat-SemiBold',
                fontSize: 14,
                color: Colors.green,
              ),
            ),
          ],
        ),
      );
    }

    // 지수 데이터가 없는 경우
    if (indices.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Row(
          children: [
            Icon(Icons.info_outline, color: Colors.grey, size: 20),
            SizedBox(width: 8),
            Text(
              '지수 데이터를 불러오는 중...',
              style: TextStyle(
                fontFamily: 'Montserrat-Regular',
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    // 정상 지수 데이터 표시
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: indices.map((idx) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  idx['name'] as String,
                  style: const TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 20,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  idx['value'] as String,
                  style: const TextStyle(
                    fontFamily: 'Montserrat-SemiBold',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${idx['change']} (${idx['changeRate']}%)',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 16,
                    color: idx['isUp'] == true ? Colors.red : Colors.blue,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildStockListSection() {
    // 크롤러가 실행 중인 경우
    if (_isStockCrawlerRunning) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.blue[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.blue[200]!),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              '주식 데이터 업데이트 중...',
              style: TextStyle(
                fontFamily: 'Montserrat-SemiBold',
                fontSize: 16,
                color: Colors.blue,
              ),
            ),
          ],
        ),
      );
    }

    // 일반 로딩 상태
    if (_isLoading) {
      return const Center(
        child: Column(
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text(
              '데이터를 불러오는 중...',
              style: TextStyle(
                fontFamily: 'Montserrat-Regular',
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    // 데이터가 없는 경우
    if (_stocksWithMarketData.isEmpty) {
      return const Center(
        child: Text(
          '등록된 주식이 없습니다.',
          style: TextStyle(
            fontFamily: 'Montserrat-Regular',
            fontSize: 16,
            color: Colors.grey,
          ),
        ),
      );
    }

    // 즐겨찾기된 주식들
    final favoriteStocks = _getFavoriteStocks();
    final nonFavoriteStocks = _getNonFavoriteStocks();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 즐겨찾기 섹션 (즐겨찾기가 있을 때만 표시)
        if (favoriteStocks.isNotEmpty) ...[
          const Text(
            '즐겨찾기',
            style: TextStyle(
              fontFamily: 'Montserrat-SemiBold',
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...favoriteStocks.map((stock) => _StockListItem(
            stock: stock,
            favoriteStocks: _favoriteStocks,
            onToggleFavorite: _toggleFavorite,
          )).toList(),
          const SizedBox(height: 24),
        ],
        // 나머지 주식들
        if (nonFavoriteStocks.isNotEmpty) ...[
          const Text(
            '전체 주식',
            style: TextStyle(
              fontFamily: 'Montserrat-SemiBold',
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...nonFavoriteStocks.map((stock) => _StockListItem(
            stock: stock,
            favoriteStocks: _favoriteStocks,
            onToggleFavorite: _toggleFavorite,
          )).toList(),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // API에서 가져온 지수 데이터 사용 (데이터가 없으면 빈 배열)
    final List<Map<String, dynamic>> indices = _indices.isNotEmpty ? _indices : [];

    final domesticStocks = [
      {
        'name': '삼성전자',
        'price': '65,800원',
        'change': '-2,000 (3.10%)',
        'isUp': false,
        'history': ['+2,824,255', '+5,927,089', '+793,653', '+5,792,914', '+3,658,686', '-687,945', '+4,943,019', '+1,234,567']
      },
      {
        'name': '프레스티지바이오파마',
        'price': '15,530원',
        'change': '0 (0.00%)',
        'isUp': null,
        'history': ['+40,898', '+4,072', '-15,858', '-11,552', '+53,247', '-687,945', '+4,943,019', '-12,345']
      },
      {
        'name': '삼일제약',
        'price': '10,690원',
        'change': '-130 (1.20%)',
        'isUp': false,
        'history': ['+40,898', '+4,072', '-15,858', '-11,552', '+53,247', '-687,945', '+4,943,019', '+8,765']
      },
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(left: 32.0, right: 32.0, top: 64.0, bottom: 16.0),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Stocks',
                          style: TextStyle(
                            fontFamily: 'Montserrat-SemiBold',
                            fontSize: 64,
                            fontWeight: FontWeight.w600,
                            letterSpacing: -2,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          _getCurrentDate(),
                          style: TextStyle(
                            fontFamily: 'Montserrat-Regular',
                            fontSize: 30,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                    Column(
                      children: [
                        ElevatedButton(
                          onPressed: widget.onManageStocks,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE8F5E8), // 연한 초록색 배경
                            foregroundColor: Colors.black, // 검은색 글자
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4), // 입력란과 같은 둥근 모서리
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          child: const Text(
                            'Manage',
                            style: TextStyle(
                              fontFamily: 'Montserrat-SemiBold',
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Colors.black, // 명시적으로 검은색 지정
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _isLoading = true;
                            });
                            _fetchStocksWithMarketData();
                            _fetchIndices();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE8F5E8), // 연한 초록색 배경
                            foregroundColor: Colors.black, // 검은색 글자
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4), // 입력란과 같은 둥근 모서리
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          child: const Text(
                            'Refresh',
                            style: TextStyle(
                              fontFamily: 'Montserrat-SemiBold',
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Colors.black, // 명시적으로 검은색 지정
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _buildIndicesSection(indices),
                const SizedBox(height: 16),
                Container(
                  height: 1,
                  color: Colors.grey[300],
                ),
                const SizedBox(height: 16),
                const Text(
                  'domestic',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                _buildStockListSection(),
                const SizedBox(height: 24),
                const Text(
                  'foreign',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'not registered',
                  style: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StockListItem extends StatelessWidget {
  final Map<String, dynamic> stock;
  final Set<String> favoriteStocks;
  final Function(String) onToggleFavorite;
  
  const _StockListItem({
    required this.stock,
    required this.favoriteStocks,
    required this.onToggleFavorite,
  });

  @override
  Widget build(BuildContext context) {
    final marketData = stock['marketData'];
    final hasMarketData = marketData != null;
    
    // 가격과 변동 정보 처리
    String priceText = '데이터 없음';
    String changeText = '';
    Color? changeColor;
    
    if (hasMarketData) {
      final price = marketData['price'];
      final change = marketData['change'];
      final changeRate = marketData['changeRate'];
      
      if (price != null) {
        final formatter = NumberFormat('#,###');
        priceText = '${formatter.format(price)}원';
      }
      
      if (change != null && changeRate != null) {
        final formatter = NumberFormat('#,###');
        final changeValue = change > 0 ? '+${formatter.format(change)}' : formatter.format(change);
        final rateValue = changeRate > 0 ? '+$changeRate' : changeRate.toString();
        changeText = '$changeValue ($rateValue%)';
        changeColor = change > 0 ? Colors.red : change < 0 ? Colors.blue : Colors.grey;
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!, width: 1.2),
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stock['name'] ?? '알 수 없음',
                          style: const TextStyle(
                            fontFamily: 'Montserrat-SemiBold',
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (stock['symbol'] != null)
                          Text(
                            stock['symbol'],
                            style: const TextStyle(
                              fontFamily: 'Montserrat-Regular',
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Row(
                    children: [
                      Container(
                        constraints: const BoxConstraints(minHeight: 64),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              priceText,
                              style: const TextStyle(
                                fontFamily: 'Montserrat-SemiBold',
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              changeText,
                              style: TextStyle(
                                fontFamily: 'Montserrat-Regular',
                                fontSize: 18,
                                color: changeColor ?? Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () {
                          onToggleFavorite(stock['symbol']);
                        },
                        child: Icon(
                          Icons.star,
                          size: 24,
                          color: favoriteStocks.contains(stock['symbol']) 
                            ? Colors.yellow 
                            : Colors.grey[400],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (hasMarketData && marketData['foreignerNetBuy'] != null) ...[
              const SizedBox(height: 12),
              Column(
                children: [
                  Row(
                    children: List.generate(4, (i) {
                      final foreignerData = marketData['foreignerNetBuy'][i];
                      final date = foreignerData?['date'];
                      final netBuy = foreignerData?['net_buy'];
                      
                      return Expanded(
                        child: SizedBox(
                          height: 56,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                date ?? '-',
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontFamily: 'Montserrat-Regular',
                                  fontSize: 14,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                netBuy != null 
                                  ? (netBuy > 0 ? '+${NumberFormat('#,###').format(netBuy)}' : NumberFormat('#,###').format(netBuy))
                                  : '-',
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontFamily: 'Montserrat-SemiBold',
                                  fontSize: 16,
                                  color: netBuy != null 
                                    ? (netBuy > 0 ? Colors.red : Colors.blue)
                                    : Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: List.generate(4, (i) {
                      final foreignerData = marketData['foreignerNetBuy'][i + 4];
                      final date = foreignerData?['date'];
                      final netBuy = foreignerData?['net_buy'];
                      
                      return Expanded(
                        child: SizedBox(
                          height: 56,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                date ?? '-',
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontFamily: 'Montserrat-Regular',
                                  fontSize: 14,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                netBuy != null 
                                  ? (netBuy > 0 ? '+${NumberFormat('#,###').format(netBuy)}' : NumberFormat('#,###').format(netBuy))
                                  : '-',
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontFamily: 'Montserrat-SemiBold',
                                  fontSize: 16,
                                  color: netBuy != null 
                                    ? (netBuy > 0 ? Colors.red : Colors.blue)
                                    : Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
} 