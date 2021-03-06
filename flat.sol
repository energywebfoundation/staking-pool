// SPDX Licence-Identifier: MIT AND  BSD-4-Clause

pragma solidity 0.8.6;

interface IClaimManager {
	function hasRole(
		address subject,
		bytes32 role,
		uint256 version
	) external view returns (bool);
}

library RolesLibrary {
	function hasRole(
		address _userAddress,
		address _claimManagerAddress,
		bytes32[] memory _roles
	) internal view returns (bool) {
		if (_roles.length == 0) {
			return true;
		}
		IClaimManager claimManager = IClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation
		for (uint256 i = 0; i < _roles.length; i++) {
			if (claimManager.hasRole(_userAddress, _roles[i], 1)) {
				return true;
			}
		}
		return false;
	}

	function isOwner(
		address _user,
		address _claimManagerAddress,
		bytes32 _ownerRole
	) internal view returns (bool) {
		IClaimManager claimManager = IClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation

		return (claimManager.hasRole(_user, _ownerRole, 1));
	}
}

/*
 * ABDK Math 64.64 Smart Contract Library.  Copyright © 2019 by ABDK Consulting.
 * Author: Mikhail Vladimirov <mikhail.vladimirov@gmail.com>
 */

/**
 * Smart contract library of mathematical functions operating with signed
 * 64.64-bit fixed point numbers.  Signed 64.64-bit fixed point number is
 * basically a simple fraction whose numerator is signed 128-bit integer and
 * denominator is 2^64.  As long as denominator is always the same, there is no
 * need to store it, thus in Solidity signed 64.64-bit fixed point numbers are
 * represented by int128 type holding only the numerator.
 */
library ABDKMath64x64 {
	/*
	 * Minimum value signed 64.64-bit fixed point number may have.
	 */
	int128 private constant MIN_64x64 = -0x80000000000000000000000000000000;

	/*
	 * Maximum value signed 64.64-bit fixed point number may have.
	 */
	int128 private constant MAX_64x64 = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

	/**
	 * Convert signed 256-bit integer number into signed 64.64-bit fixed point
	 * number.  Revert on overflow.
	 *
	 * @param x signed 256-bit integer number
	 * @return signed 64.64-bit fixed point number
	 */
	function fromInt(int256 x) internal pure returns (int128) {
		unchecked {
			require(x >= -0x8000000000000000 && x <= 0x7FFFFFFFFFFFFFFF);
			return int128(x << 64);
		}
	}

	/**
	 * Convert signed 64.64 fixed point number into signed 64-bit integer number
	 * rounding down.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64-bit integer number
	 */
	function toInt(int128 x) internal pure returns (int64) {
		unchecked {
			return int64(x >> 64);
		}
	}

	/**
	 * Convert unsigned 256-bit integer number into signed 64.64-bit fixed point
	 * number.  Revert on overflow.
	 *
	 * @param x unsigned 256-bit integer number
	 * @return signed 64.64-bit fixed point number
	 */
	function fromUInt(uint256 x) internal pure returns (int128) {
		unchecked {
			require(x <= 0x7FFFFFFFFFFFFFFF);
			return int128(int256(x << 64));
		}
	}

	/**
	 * Convert signed 64.64 fixed point number into unsigned 64-bit integer
	 * number rounding down.  Revert on underflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return unsigned 64-bit integer number
	 */
	function toUInt(int128 x) internal pure returns (uint64) {
		unchecked {
			require(x >= 0);
			return uint64(uint128(x >> 64));
		}
	}

	/**
	 * Convert signed 128.128 fixed point number into signed 64.64-bit fixed point
	 * number rounding down.  Revert on overflow.
	 *
	 * @param x signed 128.128-bin fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function from128x128(int256 x) internal pure returns (int128) {
		unchecked {
			int256 result = x >> 64;
			require(result >= MIN_64x64 && result <= MAX_64x64);
			return int128(result);
		}
	}

	/**
	 * Convert signed 64.64 fixed point number into signed 128.128 fixed point
	 * number.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 128.128 fixed point number
	 */
	function to128x128(int128 x) internal pure returns (int256) {
		unchecked {
			return int256(x) << 64;
		}
	}

	/**
	 * Calculate x + y.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @param y signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function add(int128 x, int128 y) internal pure returns (int128) {
		unchecked {
			int256 result = int256(x) + y;
			require(result >= MIN_64x64 && result <= MAX_64x64);
			return int128(result);
		}
	}

	/**
	 * Calculate x - y.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @param y signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function sub(int128 x, int128 y) internal pure returns (int128) {
		unchecked {
			int256 result = int256(x) - y;
			require(result >= MIN_64x64 && result <= MAX_64x64);
			return int128(result);
		}
	}

	/**
	 * Calculate x * y rounding down.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @param y signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function mul(int128 x, int128 y) internal pure returns (int128) {
		unchecked {
			int256 result = (int256(x) * y) >> 64;
			require(result >= MIN_64x64 && result <= MAX_64x64);
			return int128(result);
		}
	}

	/**
	 * Calculate x * y rounding towards zero, where x is signed 64.64 fixed point
	 * number and y is signed 256-bit integer number.  Revert on overflow.
	 *
	 * @param x signed 64.64 fixed point number
	 * @param y signed 256-bit integer number
	 * @return signed 256-bit integer number
	 */
	function muli(int128 x, int256 y) internal pure returns (int256) {
		unchecked {
			if (x == MIN_64x64) {
				require(
					y >= -0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF &&
						y <= 0x1000000000000000000000000000000000000000000000000
				);
				return -y << 63;
			} else {
				bool negativeResult = false;
				if (x < 0) {
					x = -x;
					negativeResult = true;
				}
				if (y < 0) {
					y = -y; // We rely on overflow behavior here
					negativeResult = !negativeResult;
				}
				uint256 absoluteResult = mulu(x, uint256(y));
				if (negativeResult) {
					require(
						absoluteResult <=
							0x8000000000000000000000000000000000000000000000000000000000000000
					);
					return -int256(absoluteResult); // We rely on overflow behavior here
				} else {
					require(
						absoluteResult <=
							0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
					);
					return int256(absoluteResult);
				}
			}
		}
	}

	/**
	 * Calculate x * y rounding down, where x is signed 64.64 fixed point number
	 * and y is unsigned 256-bit integer number.  Revert on overflow.
	 *
	 * @param x signed 64.64 fixed point number
	 * @param y unsigned 256-bit integer number
	 * @return unsigned 256-bit integer number
	 */
	function mulu(int128 x, uint256 y) internal pure returns (uint256) {
		unchecked {
			if (y == 0) return 0;

			require(x >= 0);

			uint256 lo = (uint256(int256(x)) *
				(y & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) >> 64;
			uint256 hi = uint256(int256(x)) * (y >> 128);

			require(hi <= 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
			hi <<= 64;

			require(
				hi <=
					0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF -
						lo
			);
			return hi + lo;
		}
	}

	/**
	 * Calculate x / y rounding towards zero.  Revert on overflow or when y is
	 * zero.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @param y signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function div(int128 x, int128 y) internal pure returns (int128) {
		unchecked {
			require(y != 0);
			int256 result = (int256(x) << 64) / y;
			require(result >= MIN_64x64 && result <= MAX_64x64);
			return int128(result);
		}
	}

	/**
	 * Calculate x / y rounding towards zero, where x and y are signed 256-bit
	 * integer numbers.  Revert on overflow or when y is zero.
	 *
	 * @param x signed 256-bit integer number
	 * @param y signed 256-bit integer number
	 * @return signed 64.64-bit fixed point number
	 */
	function divi(int256 x, int256 y) internal pure returns (int128) {
		unchecked {
			require(y != 0);

			bool negativeResult = false;
			if (x < 0) {
				x = -x; // We rely on overflow behavior here
				negativeResult = true;
			}
			if (y < 0) {
				y = -y; // We rely on overflow behavior here
				negativeResult = !negativeResult;
			}
			uint128 absoluteResult = divuu(uint256(x), uint256(y));
			if (negativeResult) {
				require(absoluteResult <= 0x80000000000000000000000000000000);
				return -int128(absoluteResult); // We rely on overflow behavior here
			} else {
				require(absoluteResult <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
				return int128(absoluteResult); // We rely on overflow behavior here
			}
		}
	}

	/**
	 * Calculate x / y rounding towards zero, where x and y are unsigned 256-bit
	 * integer numbers.  Revert on overflow or when y is zero.
	 *
	 * @param x unsigned 256-bit integer number
	 * @param y unsigned 256-bit integer number
	 * @return signed 64.64-bit fixed point number
	 */
	function divu(uint256 x, uint256 y) internal pure returns (int128) {
		unchecked {
			require(y != 0);
			uint128 result = divuu(x, y);
			require(result <= uint128(MAX_64x64));
			return int128(result);
		}
	}

	/**
	 * Calculate -x.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function neg(int128 x) internal pure returns (int128) {
		unchecked {
			require(x != MIN_64x64);
			return -x;
		}
	}

	/**
	 * Calculate |x|.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function abs(int128 x) internal pure returns (int128) {
		unchecked {
			require(x != MIN_64x64);
			return x < 0 ? -x : x;
		}
	}

	/**
	 * Calculate 1 / x rounding towards zero.  Revert on overflow or when x is
	 * zero.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function inv(int128 x) internal pure returns (int128) {
		unchecked {
			require(x != 0);
			int256 result = int256(0x100000000000000000000000000000000) / x;
			require(result >= MIN_64x64 && result <= MAX_64x64);
			return int128(result);
		}
	}

	/**
	 * Calculate arithmetics average of x and y, i.e. (x + y) / 2 rounding down.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @param y signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function avg(int128 x, int128 y) internal pure returns (int128) {
		unchecked {
			return int128((int256(x) + int256(y)) >> 1);
		}
	}

	/**
	 * Calculate geometric average of x and y, i.e. sqrt (x * y) rounding down.
	 * Revert on overflow or in case x * y is negative.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @param y signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function gavg(int128 x, int128 y) internal pure returns (int128) {
		unchecked {
			int256 m = int256(x) * int256(y);
			require(m >= 0);
			require(
				m <
					0x4000000000000000000000000000000000000000000000000000000000000000
			);
			return int128(sqrtu(uint256(m)));
		}
	}

	/**
	 * Calculate x^y assuming 0^0 is 1, where x is signed 64.64 fixed point number
	 * and y is unsigned 256-bit integer number.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @param y uint256 value
	 * @return signed 64.64-bit fixed point number
	 */
	function pow(int128 x, uint256 y) internal pure returns (int128) {
		unchecked {
			bool negative = x < 0 && y & 1 == 1;

			uint256 absX = uint128(x < 0 ? -x : x);
			uint256 absResult;
			absResult = 0x100000000000000000000000000000000;

			if (absX <= 0x10000000000000000) {
				absX <<= 63;
				while (y != 0) {
					if (y & 0x1 != 0) {
						absResult = (absResult * absX) >> 127;
					}
					absX = (absX * absX) >> 127;

					if (y & 0x2 != 0) {
						absResult = (absResult * absX) >> 127;
					}
					absX = (absX * absX) >> 127;

					if (y & 0x4 != 0) {
						absResult = (absResult * absX) >> 127;
					}
					absX = (absX * absX) >> 127;

					if (y & 0x8 != 0) {
						absResult = (absResult * absX) >> 127;
					}
					absX = (absX * absX) >> 127;

					y >>= 4;
				}

				absResult >>= 64;
			} else {
				uint256 absXShift = 63;
				if (absX < 0x1000000000000000000000000) {
					absX <<= 32;
					absXShift -= 32;
				}
				if (absX < 0x10000000000000000000000000000) {
					absX <<= 16;
					absXShift -= 16;
				}
				if (absX < 0x1000000000000000000000000000000) {
					absX <<= 8;
					absXShift -= 8;
				}
				if (absX < 0x10000000000000000000000000000000) {
					absX <<= 4;
					absXShift -= 4;
				}
				if (absX < 0x40000000000000000000000000000000) {
					absX <<= 2;
					absXShift -= 2;
				}
				if (absX < 0x80000000000000000000000000000000) {
					absX <<= 1;
					absXShift -= 1;
				}

				uint256 resultShift = 0;
				while (y != 0) {
					require(absXShift < 64);

					if (y & 0x1 != 0) {
						absResult = (absResult * absX) >> 127;
						resultShift += absXShift;
						if (absResult > 0x100000000000000000000000000000000) {
							absResult >>= 1;
							resultShift += 1;
						}
					}
					absX = (absX * absX) >> 127;
					absXShift <<= 1;
					if (absX >= 0x100000000000000000000000000000000) {
						absX >>= 1;
						absXShift += 1;
					}

					y >>= 1;
				}

				require(resultShift < 64);
				absResult >>= 64 - resultShift;
			}
			int256 result = negative ? -int256(absResult) : int256(absResult);
			require(result >= MIN_64x64 && result <= MAX_64x64);
			return int128(result);
		}
	}

	/**
	 * Calculate sqrt (x) rounding down.  Revert if x < 0.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function sqrt(int128 x) internal pure returns (int128) {
		unchecked {
			require(x >= 0);
			return int128(sqrtu(uint256(int256(x)) << 64));
		}
	}

	/**
	 * Calculate binary logarithm of x.  Revert if x <= 0.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function log_2(int128 x) internal pure returns (int128) {
		unchecked {
			require(x > 0);

			int256 msb = 0;
			int256 xc = x;
			if (xc >= 0x10000000000000000) {
				xc >>= 64;
				msb += 64;
			}
			if (xc >= 0x100000000) {
				xc >>= 32;
				msb += 32;
			}
			if (xc >= 0x10000) {
				xc >>= 16;
				msb += 16;
			}
			if (xc >= 0x100) {
				xc >>= 8;
				msb += 8;
			}
			if (xc >= 0x10) {
				xc >>= 4;
				msb += 4;
			}
			if (xc >= 0x4) {
				xc >>= 2;
				msb += 2;
			}
			if (xc >= 0x2) msb += 1; // No need to shift xc anymore

			int256 result = (msb - 64) << 64;
			uint256 ux = uint256(int256(x)) << uint256(127 - msb);
			for (int256 bit = 0x8000000000000000; bit > 0; bit >>= 1) {
				ux *= ux;
				uint256 b = ux >> 255;
				ux >>= 127 + b;
				result += bit * int256(b);
			}

			return int128(result);
		}
	}

	/**
	 * Calculate natural logarithm of x.  Revert if x <= 0.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function ln(int128 x) internal pure returns (int128) {
		unchecked {
			require(x > 0);

			return
				int128(
					int256(
						(uint256(int256(log_2(x))) *
							0xB17217F7D1CF79ABC9E3B39803F2F6AF) >> 128
					)
				);
		}
	}

	/**
	 * Calculate binary exponent of x.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function exp_2(int128 x) internal pure returns (int128) {
		unchecked {
			require(x < 0x400000000000000000); // Overflow

			if (x < -0x400000000000000000) return 0; // Underflow

			uint256 result = 0x80000000000000000000000000000000;

			if (x & 0x8000000000000000 > 0)
				result = (result * 0x16A09E667F3BCC908B2FB1366EA957D3E) >> 128;
			if (x & 0x4000000000000000 > 0)
				result = (result * 0x1306FE0A31B7152DE8D5A46305C85EDEC) >> 128;
			if (x & 0x2000000000000000 > 0)
				result = (result * 0x1172B83C7D517ADCDF7C8C50EB14A791F) >> 128;
			if (x & 0x1000000000000000 > 0)
				result = (result * 0x10B5586CF9890F6298B92B71842A98363) >> 128;
			if (x & 0x800000000000000 > 0)
				result = (result * 0x1059B0D31585743AE7C548EB68CA417FD) >> 128;
			if (x & 0x400000000000000 > 0)
				result = (result * 0x102C9A3E778060EE6F7CACA4F7A29BDE8) >> 128;
			if (x & 0x200000000000000 > 0)
				result = (result * 0x10163DA9FB33356D84A66AE336DCDFA3F) >> 128;
			if (x & 0x100000000000000 > 0)
				result = (result * 0x100B1AFA5ABCBED6129AB13EC11DC9543) >> 128;
			if (x & 0x80000000000000 > 0)
				result = (result * 0x10058C86DA1C09EA1FF19D294CF2F679B) >> 128;
			if (x & 0x40000000000000 > 0)
				result = (result * 0x1002C605E2E8CEC506D21BFC89A23A00F) >> 128;
			if (x & 0x20000000000000 > 0)
				result = (result * 0x100162F3904051FA128BCA9C55C31E5DF) >> 128;
			if (x & 0x10000000000000 > 0)
				result = (result * 0x1000B175EFFDC76BA38E31671CA939725) >> 128;
			if (x & 0x8000000000000 > 0)
				result = (result * 0x100058BA01FB9F96D6CACD4B180917C3D) >> 128;
			if (x & 0x4000000000000 > 0)
				result = (result * 0x10002C5CC37DA9491D0985C348C68E7B3) >> 128;
			if (x & 0x2000000000000 > 0)
				result = (result * 0x1000162E525EE054754457D5995292026) >> 128;
			if (x & 0x1000000000000 > 0)
				result = (result * 0x10000B17255775C040618BF4A4ADE83FC) >> 128;
			if (x & 0x800000000000 > 0)
				result = (result * 0x1000058B91B5BC9AE2EED81E9B7D4CFAB) >> 128;
			if (x & 0x400000000000 > 0)
				result = (result * 0x100002C5C89D5EC6CA4D7C8ACC017B7C9) >> 128;
			if (x & 0x200000000000 > 0)
				result = (result * 0x10000162E43F4F831060E02D839A9D16D) >> 128;
			if (x & 0x100000000000 > 0)
				result = (result * 0x100000B1721BCFC99D9F890EA06911763) >> 128;
			if (x & 0x80000000000 > 0)
				result = (result * 0x10000058B90CF1E6D97F9CA14DBCC1628) >> 128;
			if (x & 0x40000000000 > 0)
				result = (result * 0x1000002C5C863B73F016468F6BAC5CA2B) >> 128;
			if (x & 0x20000000000 > 0)
				result = (result * 0x100000162E430E5A18F6119E3C02282A5) >> 128;
			if (x & 0x10000000000 > 0)
				result = (result * 0x1000000B1721835514B86E6D96EFD1BFE) >> 128;
			if (x & 0x8000000000 > 0)
				result = (result * 0x100000058B90C0B48C6BE5DF846C5B2EF) >> 128;
			if (x & 0x4000000000 > 0)
				result = (result * 0x10000002C5C8601CC6B9E94213C72737A) >> 128;
			if (x & 0x2000000000 > 0)
				result = (result * 0x1000000162E42FFF037DF38AA2B219F06) >> 128;
			if (x & 0x1000000000 > 0)
				result = (result * 0x10000000B17217FBA9C739AA5819F44F9) >> 128;
			if (x & 0x800000000 > 0)
				result = (result * 0x1000000058B90BFCDEE5ACD3C1CEDC823) >> 128;
			if (x & 0x400000000 > 0)
				result = (result * 0x100000002C5C85FE31F35A6A30DA1BE50) >> 128;
			if (x & 0x200000000 > 0)
				result = (result * 0x10000000162E42FF0999CE3541B9FFFCF) >> 128;
			if (x & 0x100000000 > 0)
				result = (result * 0x100000000B17217F80F4EF5AADDA45554) >> 128;
			if (x & 0x80000000 > 0)
				result = (result * 0x10000000058B90BFBF8479BD5A81B51AD) >> 128;
			if (x & 0x40000000 > 0)
				result = (result * 0x1000000002C5C85FDF84BD62AE30A74CC) >> 128;
			if (x & 0x20000000 > 0)
				result = (result * 0x100000000162E42FEFB2FED257559BDAA) >> 128;
			if (x & 0x10000000 > 0)
				result = (result * 0x1000000000B17217F7D5A7716BBA4A9AE) >> 128;
			if (x & 0x8000000 > 0)
				result = (result * 0x100000000058B90BFBE9DDBAC5E109CCE) >> 128;
			if (x & 0x4000000 > 0)
				result = (result * 0x10000000002C5C85FDF4B15DE6F17EB0D) >> 128;
			if (x & 0x2000000 > 0)
				result = (result * 0x1000000000162E42FEFA494F1478FDE05) >> 128;
			if (x & 0x1000000 > 0)
				result = (result * 0x10000000000B17217F7D20CF927C8E94C) >> 128;
			if (x & 0x800000 > 0)
				result = (result * 0x1000000000058B90BFBE8F71CB4E4B33D) >> 128;
			if (x & 0x400000 > 0)
				result = (result * 0x100000000002C5C85FDF477B662B26945) >> 128;
			if (x & 0x200000 > 0)
				result = (result * 0x10000000000162E42FEFA3AE53369388C) >> 128;
			if (x & 0x100000 > 0)
				result = (result * 0x100000000000B17217F7D1D351A389D40) >> 128;
			if (x & 0x80000 > 0)
				result = (result * 0x10000000000058B90BFBE8E8B2D3D4EDE) >> 128;
			if (x & 0x40000 > 0)
				result = (result * 0x1000000000002C5C85FDF4741BEA6E77E) >> 128;
			if (x & 0x20000 > 0)
				result = (result * 0x100000000000162E42FEFA39FE95583C2) >> 128;
			if (x & 0x10000 > 0)
				result = (result * 0x1000000000000B17217F7D1CFB72B45E1) >> 128;
			if (x & 0x8000 > 0)
				result = (result * 0x100000000000058B90BFBE8E7CC35C3F0) >> 128;
			if (x & 0x4000 > 0)
				result = (result * 0x10000000000002C5C85FDF473E242EA38) >> 128;
			if (x & 0x2000 > 0)
				result = (result * 0x1000000000000162E42FEFA39F02B772C) >> 128;
			if (x & 0x1000 > 0)
				result = (result * 0x10000000000000B17217F7D1CF7D83C1A) >> 128;
			if (x & 0x800 > 0)
				result = (result * 0x1000000000000058B90BFBE8E7BDCBE2E) >> 128;
			if (x & 0x400 > 0)
				result = (result * 0x100000000000002C5C85FDF473DEA871F) >> 128;
			if (x & 0x200 > 0)
				result = (result * 0x10000000000000162E42FEFA39EF44D91) >> 128;
			if (x & 0x100 > 0)
				result = (result * 0x100000000000000B17217F7D1CF79E949) >> 128;
			if (x & 0x80 > 0)
				result = (result * 0x10000000000000058B90BFBE8E7BCE544) >> 128;
			if (x & 0x40 > 0)
				result = (result * 0x1000000000000002C5C85FDF473DE6ECA) >> 128;
			if (x & 0x20 > 0)
				result = (result * 0x100000000000000162E42FEFA39EF366F) >> 128;
			if (x & 0x10 > 0)
				result = (result * 0x1000000000000000B17217F7D1CF79AFA) >> 128;
			if (x & 0x8 > 0)
				result = (result * 0x100000000000000058B90BFBE8E7BCD6D) >> 128;
			if (x & 0x4 > 0)
				result = (result * 0x10000000000000002C5C85FDF473DE6B2) >> 128;
			if (x & 0x2 > 0)
				result = (result * 0x1000000000000000162E42FEFA39EF358) >> 128;
			if (x & 0x1 > 0)
				result = (result * 0x10000000000000000B17217F7D1CF79AB) >> 128;

			result >>= uint256(int256(63 - (x >> 64)));
			require(result <= uint256(int256(MAX_64x64)));

			return int128(int256(result));
		}
	}

	/**
	 * Calculate natural exponent of x.  Revert on overflow.
	 *
	 * @param x signed 64.64-bit fixed point number
	 * @return signed 64.64-bit fixed point number
	 */
	function exp(int128 x) internal pure returns (int128) {
		unchecked {
			require(x < 0x400000000000000000); // Overflow

			if (x < -0x400000000000000000) return 0; // Underflow

			return
				exp_2(
					int128(
						(int256(x) * 0x171547652B82FE1777D0FFDA0D23A7D12) >> 128
					)
				);
		}
	}

	/**
	 * Calculate x / y rounding towards zero, where x and y are unsigned 256-bit
	 * integer numbers.  Revert on overflow or when y is zero.
	 *
	 * @param x unsigned 256-bit integer number
	 * @param y unsigned 256-bit integer number
	 * @return unsigned 64.64-bit fixed point number
	 */
	function divuu(uint256 x, uint256 y) private pure returns (uint128) {
		unchecked {
			require(y != 0);

			uint256 result;

			if (x <= 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
				result = (x << 64) / y;
			else {
				uint256 msb = 192;
				uint256 xc = x >> 192;
				if (xc >= 0x100000000) {
					xc >>= 32;
					msb += 32;
				}
				if (xc >= 0x10000) {
					xc >>= 16;
					msb += 16;
				}
				if (xc >= 0x100) {
					xc >>= 8;
					msb += 8;
				}
				if (xc >= 0x10) {
					xc >>= 4;
					msb += 4;
				}
				if (xc >= 0x4) {
					xc >>= 2;
					msb += 2;
				}
				if (xc >= 0x2) msb += 1; // No need to shift xc anymore

				result = (x << (255 - msb)) / (((y - 1) >> (msb - 191)) + 1);
				require(result <= 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);

				uint256 hi = result * (y >> 128);
				uint256 lo = result * (y & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);

				uint256 xh = x >> 192;
				uint256 xl = x << 64;

				if (xl < lo) xh -= 1;
				xl -= lo; // We rely on overflow behavior here
				lo = hi << 128;
				if (xl < lo) xh -= 1;
				xl -= lo; // We rely on overflow behavior here

				assert(xh == hi >> 128);

				result += xl / y;
			}

			require(result <= 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
			return uint128(result);
		}
	}

	/**
	 * Calculate sqrt (x) rounding down, where x is unsigned 256-bit integer
	 * number.
	 *
	 * @param x unsigned 256-bit integer number
	 * @return unsigned 128-bit integer number
	 */
	function sqrtu(uint256 x) private pure returns (uint128) {
		unchecked {
			if (x == 0) return 0;
			else {
				uint256 xx = x;
				uint256 r = 1;
				if (xx >= 0x100000000000000000000000000000000) {
					xx >>= 128;
					r <<= 64;
				}
				if (xx >= 0x10000000000000000) {
					xx >>= 64;
					r <<= 32;
				}
				if (xx >= 0x100000000) {
					xx >>= 32;
					r <<= 16;
				}
				if (xx >= 0x10000) {
					xx >>= 16;
					r <<= 8;
				}
				if (xx >= 0x100) {
					xx >>= 8;
					r <<= 4;
				}
				if (xx >= 0x10) {
					xx >>= 4;
					r <<= 2;
				}
				if (xx >= 0x8) {
					r <<= 1;
				}
				r = (r + x / r) >> 1;
				r = (r + x / r) >> 1;
				r = (r + x / r) >> 1;
				r = (r + x / r) >> 1;
				r = (r + x / r) >> 1;
				r = (r + x / r) >> 1;
				r = (r + x / r) >> 1; // Seven iterations should be enough
				uint256 r1 = x / r;
				return uint128(r < r1 ? r : r1);
			}
		}
	}
}

contract StakingPool {
	using ABDKMath64x64 for int128;
	using RolesLibrary for address;

	address public claimManager;

	uint256 public start;
	uint256 public end;

	uint256 public hourlyRatio;
	uint256 public hardCap;
	uint256 public contributionLimit;

	uint256 public totalStaked;

	bytes32[] private patronRoles;
	bytes32 private ownerRole;

	uint256 private remainingRewards;
	uint256 private futureRewards;

	bool public sweeped;

	address internal initiator;

	struct Stake {
		uint256 deposit;
		uint256 compounded;
		uint256 time;
		uint256 futureReward;
	}

	event StakeAdded(address indexed sender, uint256 amount, uint256 time);
	event StakeWithdrawn(address indexed sender, uint256 amount);
	event StakingPoolInitialized(uint256 funded, uint256 timestamp);

	mapping(address => Stake) public stakes;

	modifier onlyOwner() virtual {
		// restrict to accounts enrolled as owner at energyweb
		require(
			msg.sender.isOwner(claimManager, ownerRole),
			"OnlyOwner: Not an owner"
		);
		_;
	}

	modifier onlyPatrons(address _agent) virtual {
		// checking patron role with claimManager
		require(
			_agent.hasRole(claimManager, patronRoles),
			"StakingPool: Not a patron"
		);
		_;
	}

	modifier belowContributionLimit() {
		require(
			stakes[msg.sender].deposit + msg.value <= contributionLimit,
			"Stake greater than contribution limit"
		);
		_;
	}

	modifier initialized() {
		require(start != 0, "Staking Pool not initialized");
		_;
	}

	modifier preventReset() {
		require(start == 0, "Staking Pool already initialized");
		_;
	}

	constructor(bytes32 _ownerRole, address _claimManager) {
		ownerRole = _ownerRole;
		claimManager = _claimManager;
	}

	function init(
		uint256 _start,
		uint256 _end,
		uint256 _hourlyRatio,
		uint256 _hardCap,
		uint256 _contributionLimit,
		bytes32[] memory _patronRoles
	) external payable onlyOwner preventReset {
		require(
			_start >= block.timestamp,
			"Start date should be at least current block timestamp"
		);
		// check if stake pool time is at least 1 day
		require(_end - _start >= 1 days, "Duration should be at least 1 day");
		require(_hardCap >= _contributionLimit, "hardCap exceeded");

		uint256 maxFutureRewards = compound(
			_hourlyRatio,
			_hardCap,
			_start,
			_end
		) - _hardCap;

		require(msg.value >= maxFutureRewards, "Rewards lower than expected");

		start = _start;
		end = _end;
		hourlyRatio = _hourlyRatio;
		hardCap = _hardCap;
		contributionLimit = _contributionLimit;
		patronRoles = _patronRoles;

		remainingRewards = msg.value;

		initiator = msg.sender;

		emit StakingPoolInitialized(msg.value, block.timestamp);
	}

	function terminate() external initialized onlyOwner {
		require(start >= block.timestamp, "Cannot terminate after start");

		uint256 payout = remainingRewards;
		address receipient = initiator;

		delete start;
		delete end;
		delete hourlyRatio;
		delete hardCap;
		delete contributionLimit;
		delete patronRoles;
		delete initiator;

		payable(receipient).transfer(payout);
	}

	function stake()
		public
		payable
		onlyPatrons(msg.sender)
		initialized
		belowContributionLimit
	{
		// check role with claimManager
		require(block.timestamp >= start, "Staking pool not yet started");
		require(block.timestamp <= end, "Staking pool already expired");

		require(hardCap - totalStaked >= msg.value, "Staking pool is full");

		(, uint256 compounded) = total();

		updateStake(
			stakes[msg.sender].deposit + msg.value,
			compounded + msg.value
		);
		accountFutureReward();

		totalStaked += msg.value;

		emit StakeAdded(msg.sender, msg.value, block.timestamp);
	}

	function unstake(uint256 value) public initialized {
		(uint256 deposit, uint256 compounded) = total();

		require(compounded > 0, "No funds available");

		require(
			compounded >= value,
			"Requested value above the compounded funds"
		);

		uint256 depositComponent = value <= deposit ? value : deposit;
		uint256 rewardComponent = value > deposit ? value - deposit : 0;

		if (value == compounded) {
			delete stakes[msg.sender];
		} else {
			updateStake(
				stakes[msg.sender].deposit - depositComponent,
				compounded - value
			);
			accountFutureReward();
		}

		futureRewards -= rewardComponent;
		remainingRewards -= rewardComponent;
		totalStaked -= depositComponent;

		payable(msg.sender).transfer(value);

		emit StakeWithdrawn(msg.sender, value);
	}

	//allow specifing the value
	function unstakeAll() public initialized {
		(, uint256 compounded) = total();

		unstake(compounded);
	}

	function sweep() public initialized onlyOwner {
		require(!sweeped, "Already sweeped");
		require(block.timestamp >= end, "Cannot sweep before expiry");

		uint256 payout = remainingRewards - futureRewards;

		sweeped = true;

		payable(initiator).transfer(payout);
	}

	function calculateFutureReward() private view returns (uint256) {
		return
			compound(
				hourlyRatio,
				stakes[msg.sender].compounded,
				block.timestamp,
				end
			) - stakes[msg.sender].deposit;
	}

	function accountFutureReward() private {
		uint256 futureReward = calculateFutureReward();

		futureRewards -= stakes[msg.sender].futureReward;
		futureRewards += futureReward;

		stakes[msg.sender].futureReward = futureReward;
	}

	function updateStake(uint256 deposit, uint256 compounded) private {
		stakes[msg.sender].deposit = deposit;
		stakes[msg.sender].compounded = compounded;
		if (block.timestamp - stakes[msg.sender].time >= 1 hours) {
			stakes[msg.sender].time = block.timestamp;
		}
	}

	function total() public view returns (uint256, uint256) {
		Stake memory senderStake = stakes[msg.sender];

		// checks if there is no stake added
		if (senderStake.time == 0) {
			return (0, 0);
		}

		uint256 compoundEnd = block.timestamp > end ? end : block.timestamp;

		uint256 compounded = compound(
			hourlyRatio,
			senderStake.compounded,
			senderStake.time,
			compoundEnd
		);

		return (senderStake.deposit, compounded);
	}

	function compound(
		uint256 ratio,
		uint256 principal,
		uint256 compoundStart,
		uint256 compoundEnd
	) public view returns (uint256) {
		uint256 n = (compoundEnd - compoundStart) / 1 hours;

		return
			ABDKMath64x64.mulu(
				ABDKMath64x64.pow(
					ABDKMath64x64.add(
						ABDKMath64x64.fromUInt(1),
						ABDKMath64x64.divu(ratio, 10**18)
					),
					n
				),
				principal
			);
	}
}

// File contracts/StakingPoolNoKYC.sol

contract StakingPoolNoKYC is StakingPool {
	modifier onlyOwner() override {
		// restrict to the account that was set as initiator
		require(msg.sender == initiator, "OnlyOwner: Not an owner");
		_;
	}

	modifier onlyPatrons(address _agent) override {
		// no role check, just pass
		_;
	}

	constructor(address _initiator) StakingPool(bytes32(0), address(0)) {
		require(_initiator != address(0));

		initiator = _initiator;
	}
}

contract StakingPoolPatronKYC is StakingPool {
	modifier onlyOwner() override {
		// restrict to the account that was set as initiator
		require(msg.sender == initiator, "OnlyOwner: Not an owner");
		_;
	}

	constructor(address _initiator, address _claimManager)
		StakingPool(bytes32(0), _claimManager)
	{
		require(_initiator != address(0));

		initiator = _initiator;
	}
}
