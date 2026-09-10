export type JournalStackParamList = {
  JournalList: undefined;
  TradeForm: {tradeId?: string; isPaper?: boolean};
  TradeReview: {tradeId: string};
  TradeDetail: {tradeId: string};
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Profile: undefined;
};
