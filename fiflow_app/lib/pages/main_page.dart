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
  bool _isLoading = true;

  // API 서버 URL 설정
  String get _apiBaseUrl {
    return 'http://localhost:3000'; // 로컬 개발용
  }

  @override
  void initState() {
    super.initState();
    _fetchStocksWithMarketData();
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

  @override
  Widget build(BuildContext context) {
    // 더미 데이터 (API에서 데이터를 가져오지 못할 때 사용)
    final indices = [
      {
        'name': 'KOSPI',
        'value': '3,163.84',
        'change': '-46.97',
        'percent': '(1.46%)',
        'isUp': false
      },
      {
        'name': 'KOSDAQ',
        'value': '812.29',
        'change': '-9.41',
        'percent': '(1.14%)',
        'isUp': false
      },
      {
        'name': 'S&P500',
        'value': '6,305.60',
        'change': '+8.81',
        'percent': '(0.14%)',
        'isUp': true
      },
    ];

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
                          '2025.07.22',
                          style: TextStyle(
                            fontFamily: 'Montserrat-Regular',
                            fontSize: 30,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                    OutlinedButton(
                      onPressed: widget.onManageStocks,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.black12),
                        backgroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      child: const Text(
                        'Manage',
                        style: TextStyle(
                          fontFamily: 'Montserrat-Regular',
                          fontSize: 18,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
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
                              '${idx['change']}${idx['percent']}',
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
                ),
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
                _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _stocksWithMarketData.isEmpty
                    ? const Center(
                        child: Text(
                          '등록된 주식이 없습니다.',
                          style: TextStyle(
                            fontFamily: 'Montserrat-Regular',
                            fontSize: 16,
                            color: Colors.grey,
                          ),
                        ),
                      )
                    : Column(
                        children: _stocksWithMarketData.map((stock) => _StockListItem(stock: stock)).toList(),
                      ),
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
  const _StockListItem({required this.stock});

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
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: Colors.black12,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
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
              ],
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