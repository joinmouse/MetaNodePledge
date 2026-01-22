package statecode

const (
	// LangZh language
	LangZh   = 111
	LangEn   = 112
	LangZhTw = 113

	// CommonSuccess common
	CommonSuccess      = 0
	CommonErrServerErr = 1000
	ParameterEmptyErr  = 1001

	TokenErr = 1102 //token error

	// PNameEmpty muti-sign
	PNameEmpty   = 1201 //p_name empty
	ChainIdEmpty = 1202 //chain id empty
	ChainIdErr   = 1203 //chain id error

	NameOrPasswordErr = 1303 //name or password error

)

var Msg = map[int]map[int]string{

	0: {
		LangZh:   "成功",
		LangZhTw: "成功",
		LangEn:   "success",
	},
	1000: {
		LangZh:   "服务器繁忙，请稍后重试",
		LangZhTw: "服務器繁忙，請稍後重試",
		LangEn:   "server is busy, please try again later",
	},
	1001: {
		LangZh:   "参数不能为空",
		LangZhTw: "参数不能為空",
		LangEn:   "parameter is empty",
	},
	1101: {
		LangZh:   "token 不能为空",
		LangZhTw: "token 不能為空",
		LangEn:   "token required",
	},
	1102: {
		LangZh:   "token错误",
		LangZhTw: "token錯誤",
		LangEn:   "token invalid",
	},
	1201: {
		LangZh:   "sp_name 不能为空",
		LangZhTw: "sp_name 不能為空",
		LangEn:   "sp_name required",
	},
	1202: {
		LangZh:   "chainId 不能为空",
		LangZhTw: "chainId 不能為空",
		LangEn:   "chainId required",
	},
	1203: {
		LangZh:   "chainId 错误",
		LangZhTw: "chainId 錯誤",
		LangEn:   "chainId error",
	},
	1301: {
		LangZh:   "name 不能为空",
		LangZhTw: "name 不能為空",
		LangEn:   "name required",
	},
	1302: {
		LangZh:   "password 不能为空",
		LangZhTw: "password 不能為空",
		LangEn:   "password required",
	},
	1303: {
		LangZh:   "用户名或密码错误",
		LangZhTw: "用戶名或密碼錯誤",
		LangEn:   "name or password error",
	},
}

func GetMsg(c int, lang int) string {
	_, ok := Msg[c]
	if ok {
		msg, ok := Msg[c][lang]
		if ok {
			return msg
		}
		return Msg[CommonErrServerErr][lang]
	}
	return Msg[CommonErrServerErr][lang]
}
